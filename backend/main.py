"""
ShadowAgent Backend — FastAPI application entry point.
Supabase credentials live ONLY in backend environment variables.
The frontend never receives credentials.
"""

from __future__ import annotations

import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings, SettingsConfigDict

from engine import (
    SimulationEngine,
    get_topology_response,
    NetworkTopology,
    SimulationResult,
    SimulationRequest,
    RunSummary,
    CompareRequest,
    ComparisonMetricDiff,
    ComparisonResult,
    AnalyticsSummary,
    RLTrainRequest,
)
from persistence import (
    config as supabase_config,
    test_connection,
    get_repository,
    SupabaseRepository,
)
from rl import (
    train_ppo_agent,
    evaluate_policy_against_baseline,
    get_rl_status as rl_status_probe,
)


# ── Settings ──────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()

# ── Simulation Engine & Persistence Helper ────────────────────────────────────

_engine = SimulationEngine()
_topology = get_topology_response()


def _persist_run(result: SimulationResult) -> SimulationResult:
    """Helper to persist a simulation run to the active repository."""
    repo = get_repository()
    try:
        ok1 = repo.create_run(result.run_id, result.started_at)
        ok2 = repo.save_network_nodes(result.run_id, _topology.nodes, result.node_statuses)
        ok3 = repo.save_events(result.run_id, result.events)
        ok4 = repo.complete_run(result.run_id, result.completed_at, result.metrics, status="completed")

        if ok1 and ok2 and ok3 and ok4:
            result.persisted = True
            result.persistence_backend = "supabase" if isinstance(repo, SupabaseRepository) else "in_memory"
            result.persistence_message = (
                "Successfully saved to Supabase database."
                if isinstance(repo, SupabaseRepository)
                else "Saved to in-memory session cache."
            )
        else:
            repo.fail_run(result.run_id, "Persistence write failed", result.completed_at)
            result.persisted = False
            result.persistence_backend = "supabase" if isinstance(repo, SupabaseRepository) else "in_memory"
            result.persistence_message = "Persistence error: Database operation failed. Run marked as failed."

    except Exception as exc:
        repo.fail_run(result.run_id, str(type(exc).__name__), result.completed_at)
        result.persisted = False
        result.persistence_backend = "supabase" if isinstance(repo, SupabaseRepository) else "in_memory"
        result.persistence_message = f"Persistence error: {type(exc).__name__}"

    return result


logger = logging.getLogger("shadowagent.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Safe startup probe for Supabase connectivity and schema readiness."""
    logger.info("[ShadowAgent] Backend startup: initializing repository...")
    repo = get_repository()
    if supabase_config.is_configured:
        connected, msg = test_connection()
        if connected:
            logger.info("[ShadowAgent] Storage Engine: Supabase PostgreSQL connected.")
        else:
            logger.warning("[ShadowAgent] Storage Engine: Supabase configured, diagnostic: %s", msg)
    else:
        logger.info("[ShadowAgent] Storage Engine: InMemoryRepository active (Supabase unconfigured).")
    yield
    logger.info("[ShadowAgent] Backend shutdown.")


# ── FastAPI Application ───────────────────────────────────────────────────────

app = FastAPI(
    title="ShadowAgent API",
    description=(
        "Isolated, fictional cybersecurity multi-agent simulation sandbox. "
        "Educational use only — no real networks are accessed or affected."
    ),
    version="0.4.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["meta"])
def root():
    """Basic API metadata and route listing."""
    return {
        "message": "ShadowAgent API is running",
        "project": "ShadowAgent",
        "version": "0.4.0",
        "docs": "/docs",
        "endpoints": [
            "GET /",
            "GET /health",
            "GET /network",
            "POST /simulate",
            "POST /compare",
            "GET /runs",
            "GET /runs/{run_id}",
            "GET /metrics",
            "GET /analytics",
            "GET /rl/status",
            "POST /rl/train",
            "POST /rl/evaluate",
        ],
    }


@app.get("/health", tags=["meta"])
def health():
    """
    Health check reporting backend operational status,
    safe Supabase connectivity state, and active persistence engine.
    Never exposes credentials or secrets.
    """
    repo = get_repository()
    is_supabase = isinstance(repo, SupabaseRepository)
    is_connected = False
    status_msg = "Running with in-memory persistence fallback."

    if supabase_config.is_configured:
        is_connected, probe_msg = test_connection()
        status_msg = probe_msg
    else:
        status_msg = supabase_config.configuration_status

    migration_required = (
        supabase_config.is_configured
        and not is_connected
        and ("table does not exist" in status_msg.lower() or "schema" in status_msg.lower())
    )

    return {
        "status": "ok",
        "project": "ShadowAgent",
        "version": "0.4.0",
        "supabase_configured": supabase_config.is_configured,
        "supabase_connected": is_connected,
        "storage_adapter": "SupabaseRepository" if is_supabase else "InMemoryRepository",
        "persistence_backend": "supabase" if (is_supabase and is_connected) else "in_memory",
        "persistence_status": status_msg,
        "migration_required": migration_required,
        "simulation": "ready",
    }


@app.get("/network", response_model=NetworkTopology, tags=["topology"])
def get_network():
    """Return the fictional enterprise network topology."""
    return get_topology_response()


@app.post("/simulate", response_model=SimulationResult, tags=["simulation"])
def simulate(req: Optional[SimulationRequest] = None):
    """
    Execute one deterministic, isolated simulation run.
    Persists run records, network nodes, and simulation events to the
    configured repository (Supabase PostgreSQL with fallback to in-memory cache).
    """
    if req is None:
        req = SimulationRequest()

    result = _engine.run(req)
    return _persist_run(result)


@app.post("/compare", response_model=ComparisonResult, tags=["comparison"])
def compare_defense(req: Optional[CompareRequest] = None):
    """
    Execute two simulation runs under identical network and seed conditions to evaluate
    the empirical effectiveness of different defense postures.
    Persists both runs in the repository.
    """
    if req is None:
        req = CompareRequest()

    seed = req.seed if req.seed is not None else 42

    # Run Configuration A
    req_a = SimulationRequest(
        seed=seed,
        detection_sensitivity=req.config_a.detection_sensitivity,
        honeypot_enabled=req.config_a.honeypot_enabled,
        aggressive_red=req.config_a.aggressive_red,
    )
    res_a = _persist_run(_engine.run(req_a))

    # Run Configuration B
    req_b = SimulationRequest(
        seed=seed,
        detection_sensitivity=req.config_b.detection_sensitivity,
        honeypot_enabled=req.config_b.honeypot_enabled,
        aggressive_red=req.config_b.aggressive_red,
    )
    res_b = _persist_run(_engine.run(req_b))

    ma = res_a.metrics
    mb = res_b.metrics

    diff = ComparisonMetricDiff(
        detection_rate_delta=round(mb.detection_rate - ma.detection_rate, 4),
        containment_success_delta=mb.successful_containment - ma.successful_containment,
        compromised_assets_delta=mb.compromised_assets - ma.compromised_assets,
        false_positives_delta=mb.false_positives - ma.false_positives,
        events_generated_delta=mb.total_events - ma.total_events,
        runtime_ms_delta=mb.simulation_duration_ms - ma.simulation_duration_ms,
    )

    det_diff_pct = round(diff.detection_rate_delta * 100, 1)
    analysis = (
        f"Under deterministic seed {seed}, Configuration B demonstrated a {det_diff_pct:+}% detection rate delta "
        f"and contained {diff.containment_success_delta:+} additional attacks compared to Configuration A. "
        f"Compromised assets changed by {diff.compromised_assets_delta:+}. "
        f"False positive alerts differed by {diff.false_positives_delta:+}. Both runs were stored for audit."
    )

    metric_defs = {
        "detection_rate": "Ratio of detected Red Team threats to total generated threats",
        "containment_success": "Attack events actively thwarted or isolated by Blue Team actions",
        "compromised_assets": "Count of network assets currently in compromised or isolated state",
        "false_positives": "Defensive alerts generated where no adversarial action was active",
        "events_generated": "Total simulation events logged across all 4 phases",
        "runtime_ms": "Simulated timeline duration in virtual milliseconds",
    }

    limitations = [
        "Identical random seeds ensure fair attack sequence comparability, but real-world adversaries adapt dynamically.",
        "Detection sensitivity acts as a stochastic probability model and does not simulate signature/behavioral ML classifiers.",
        "Fictional 9-node graph models structural segments but omits OS-level kernel telemetry and network jitter.",
    ]

    return ComparisonResult(
        seed=seed,
        run_a=res_a,
        run_b=res_b,
        diff=diff,
        analysis=analysis,
        metric_definitions=metric_defs,
        limitations=limitations,
    )


@app.get("/analytics", response_model=AnalyticsSummary, tags=["analytics"])
def get_analytics():
    """
    Compute aggregate security metrics across all stored simulation runs in the repository.
    Aggregates threat detections, containment success, severity distribution, and run trends.
    """
    repo = get_repository()
    raw_runs = repo.list_runs(limit=100)

    if not raw_runs:
        return AnalyticsSummary(
            total_runs=0,
            total_threats_generated=0,
            total_threats_detected=0,
            overall_detection_rate=0.0,
            total_attacks_blocked=0,
            total_containment_success=0,
            overall_containment_rate=0.0,
            total_false_positives=0,
            avg_false_positives_per_run=0.0,
            total_compromised_assets=0,
            avg_compromised_assets_per_run=0.0,
            avg_duration_ms=0.0,
            avg_response_time_ms=0.0,
            severity_distribution={"low": 0, "medium": 0, "high": 0, "critical": 0},
            agent_distribution={"Red Team": 0, "Blue Team": 0},
            run_trends=[],
            has_data=False,
        )

    total_runs = len(raw_runs)
    total_threats_gen = 0
    total_threats_det = 0
    total_blocked = 0
    total_containment = 0
    total_fps = 0
    total_compromised = 0
    total_duration = 0
    total_resp_time = 0

    run_trends = []
    # Oldest to newest for trend chart
    chronological_runs = list(reversed(raw_runs))
    for idx, r in enumerate(chronological_runs):
        m = r.get("metrics") or {}
        t_gen = int(m.get("threats_generated", r.get("total_events", 0)))
        t_det = int(m.get("threats_detected", r.get("threats_detected", 0)))
        t_blk = int(m.get("attacks_blocked", r.get("attacks_blocked", 0)))
        t_cont = int(m.get("successful_containment", t_blk))
        fps = int(m.get("false_positives", 0))
        comp = int(m.get("compromised_assets", r.get("compromised_assets", 0)))
        dur = int(m.get("simulation_duration_ms", 0))
        resp_t = int(m.get("response_time_ms", 0))
        det_rate = float(r.get("detection_rate", m.get("detection_rate", 0.0)))

        total_threats_gen += t_gen
        total_threats_det += t_det
        total_blocked += t_blk
        total_containment += t_cont
        total_fps += fps
        total_compromised += comp
        total_duration += dur
        total_resp_time += resp_t

        run_trends.append({
            "run_index": idx + 1,
            "run_id": str(r.get("run_id") or r.get("id")),
            "seed": m.get("seed"),
            "detection_rate": round(det_rate * 100, 1),
            "containment_rate": round((t_cont / max(t_gen, 1)) * 100, 1),
            "threats_detected": t_det,
            "threats_generated": t_gen,
            "false_positives": fps,
            "compromised_assets": comp,
            "duration_ms": dur,
        })

    # Aggregated severity and agent distributions from recent runs' event tables
    severity_dist: dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    agent_dist: dict[str, int] = {"Red Team": 0, "Blue Team": 0}

    # Inspect up to 10 most recent runs for event-level metrics
    for r in raw_runs[:10]:
        run_id = str(r.get("id") or r.get("run_id"))
        detail = repo.get_run(run_id)
        if detail and "events" in detail:
            for ev in detail["events"]:
                sev = str(ev.get("severity", "low")).lower()
                if sev in severity_dist:
                    severity_dist[sev] += 1
                ag = str(ev.get("agent", ""))
                if "red" in ag.lower():
                    agent_dist["Red Team"] += 1
                elif "blue" in ag.lower():
                    agent_dist["Blue Team"] += 1

    overall_det_rate = round(total_threats_det / max(total_threats_gen, 1), 4)
    overall_cont_rate = round(total_containment / max(total_threats_gen, 1), 4)

    return AnalyticsSummary(
        total_runs=total_runs,
        total_threats_generated=total_threats_gen,
        total_threats_detected=total_threats_det,
        overall_detection_rate=overall_det_rate,
        total_attacks_blocked=total_blocked,
        total_containment_success=total_containment,
        overall_containment_rate=overall_cont_rate,
        total_false_positives=total_fps,
        avg_false_positives_per_run=round(total_fps / total_runs, 2),
        total_compromised_assets=total_compromised,
        avg_compromised_assets_per_run=round(total_compromised / total_runs, 2),
        avg_duration_ms=round(total_duration / total_runs, 1),
        avg_response_time_ms=round(total_resp_time / total_runs, 1),
        severity_distribution=severity_dist,
        agent_distribution=agent_dist,
        run_trends=run_trends,
        has_data=True,
    )


@app.get("/rl/status", tags=["rl"])
def get_rl():
    """Return Gymnasium environment specifications, reward function, and trained model status."""
    return rl_status_probe()


@app.post("/rl/train", tags=["rl"])
def train_rl(req: Optional[RLTrainRequest] = None):
    """
    Train a Stable-Baselines3 PPO agent on the CyberDefenseEnv.
    Saves model weights locally (never committed to Git) and returns an
    empirical evaluation against the heuristic rule-based baseline.
    """
    if req is None:
        req = RLTrainRequest()
    return train_ppo_agent(total_timesteps=req.total_timesteps, seed=req.seed)


@app.post("/rl/evaluate", tags=["rl"])
def evaluate_rl(n_episodes: int = 25):
    """
    Empirically evaluate the trained RL agent against the Rule-Based Defender
    and Random Baseline under identical seeded conditions.
    """
    return evaluate_policy_against_baseline(n_episodes=n_episodes)


@app.get("/runs", response_model=list[RunSummary], tags=["history"])
def list_runs():
    """Retrieve up to 50 recent simulation run summaries."""
    repo = get_repository()
    raw_runs = repo.list_runs(limit=50)

    # Coerce to RunSummary models safely
    summaries = []
    for r in raw_runs:
        m = r.get("metrics") or {}
        summaries.append(
            RunSummary(
                id=str(r.get("id") or r.get("run_id")),
                run_id=str(r.get("id") or r.get("run_id")),
                status=r.get("status", "completed"),
                started_at=r.get("started_at", ""),
                completed_at=r.get("completed_at"),
                seed=m.get("seed"),
                total_events=r.get("total_events", m.get("total_events", 0)),
                threats_detected=r.get("threats_detected", m.get("threats_detected", 0)),
                attacks_blocked=r.get("attacks_blocked", m.get("attacks_blocked", 0)),
                detection_rate=float(r.get("detection_rate", m.get("detection_rate", 0.0))),
                compromised_assets=r.get("compromised_assets", m.get("compromised_assets", 0)),
                data_protected=bool(r.get("data_protected", m.get("data_protected", True))),
                metrics=m,
            )
        )
    return summaries


@app.get("/runs/{run_id}", tags=["history"])
def get_run(run_id: str):
    """
    Retrieve full details of a specific simulation run,
    including run metadata, network nodes, and chronological events.
    """
    repo = get_repository()
    data = repo.get_run(run_id)

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation run '{run_id}' not found.",
        )

    return data


@app.get("/metrics", tags=["simulation"])
def get_metrics():
    """
    Return definition metadata for all calculated simulation metrics
    and allowable ranges for configurable parameters.
    """
    return {
        "metric_definitions": {
            "total_events":           "Total simulated events generated (Red + Blue)",
            "threats_generated":      "Total Red Team attack attempts",
            "threats_detected":       "Red Team attack vectors detected by Blue Team defenses",
            "detection_rate":         "Ratio of detected threats to total threats generated (0.0 - 1.0)",
            "false_positives":        "Defensive alerts triggered without a corresponding threat",
            "successful_containment": "Attack actions that were blocked or mitigated (success=False)",
            "compromised_assets":     "Distinct nodes in COMPROMISED or ISOLATED status",
            "data_protected":         "True if no data exfiltration attempt succeeded",
            "attacks_blocked":        "Total attacks mitigated or blocked",
            "simulation_duration_ms": "Simulated timeline duration in virtual milliseconds",
            "response_time_ms":       "Deterministic reaction time derived from simulation seed",
        },
        "config_parameters": {
            "seed":                  "Integer — fixed seed guarantees reproducible events and metrics",
            "detection_sensitivity": "Float [0.0 - 1.0] — probability of Blue Team detecting each attack",
            "honeypot_enabled":      "Boolean — enables active monitoring on decoy server honeypot-1",
            "aggressive_red":        "Boolean — enables additional attack vectors (credential spray, file enumeration)",
        },
    }
