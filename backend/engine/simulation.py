"""
ShadowAgent Simulation Engine.

Implements a deterministic, seeded, multi-phase cybersecurity simulation.
The simulation is fully self-contained and fictitious:
 - No real network calls.
 - No real credentials.
 - No real attack tools.

Red Team agent traverses the fictional network graph and generates attack events.
Blue Team agent applies detection rules based on configuration.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from random import Random

import networkx as nx

from .models import (
    AgentTeam,
    NodeStatus,
    Severity,
    SimulationConfig,
    SimulationEvent,
    SimulationMetrics,
    SimulationRequest,
    SimulationResult,
)
from .network import build_network


# ── Attack catalogue ──────────────────────────────────────────────────────────

@dataclass
class AttackSpec:
    action:    str
    severity:  Severity
    message:   str
    base_prob: float   # probability attack succeeds before blue-team intervention


@dataclass
class DefenseSpec:
    action:   str
    severity: Severity
    message:  str


PHASE_ATTACKS: dict[int, list[AttackSpec]] = {
    1: [  # Initial access
        AttackSpec("phishing_attempt",    Severity.MEDIUM,   "Simulated phishing email delivered to employee workstation",             0.85),
        AttackSpec("credential_theft",    Severity.HIGH,     "Simulated credential-harvesting form submitted to identity server",      0.70),
    ],
    2: [  # Lateral movement
        AttackSpec("lateral_movement",    Severity.HIGH,     "Simulated lateral movement from workstation to application server",      0.65),
        AttackSpec("privilege_escalation",Severity.CRITICAL, "Simulated privilege escalation exploit attempted on application server", 0.50),
    ],
    3: [  # Target acquisition
        AttackSpec("reconnaissance",      Severity.HIGH,     "Simulated enumeration of database schema and table contents",           0.75),
        AttackSpec("honeypot_probe",      Severity.CRITICAL, "Simulated probe of decoy server — honeypot alert triggered",           0.90),
    ],
    4: [  # Exfiltration
        AttackSpec("data_exfiltration",   Severity.CRITICAL, "Simulated bulk data exfiltration attempt from database server",        0.40),
        AttackSpec("persistence_attempt", Severity.HIGH,     "Simulated backdoor installation attempt on file server",               0.35),
    ],
}

PHASE_ATTACK_NODES: dict[int, list[str]] = {
    1: ["user-1", "identity-1"],
    2: ["app-1",  "app-1"],
    3: ["db-1",   "honeypot-1"],
    4: ["db-1",   "fileserver-1"],
}

PHASE_DEFENSES: dict[int, list[DefenseSpec]] = {
    1: [
        DefenseSpec("anomaly_detected",    Severity.HIGH,    "SIEM detected unusual authentication pattern — investigation triggered"),
    ],
    2: [
        DefenseSpec("threat_investigated", Severity.HIGH,    "Blue Team investigated lateral movement alert from SIEM"),
        DefenseSpec("access_blocked",      Severity.CRITICAL,"Firewall rule deployed — suspicious source blocked at perimeter"),
    ],
    3: [
        DefenseSpec("honeypot_alert",      Severity.CRITICAL,"Honeypot access confirmed — attacker location flagged"),
    ],
    4: [
        DefenseSpec("session_terminated",  Severity.HIGH,    "Compromised session forcibly terminated on identity server"),
        DefenseSpec("account_quarantined", Severity.HIGH,    "Affected user account quarantined pending forensic review"),
        DefenseSpec("incident_logged",     Severity.MEDIUM,  "Full incident record written to SIEM audit log"),
    ],
}

PHASE_DEFENSE_NODES: dict[int, list[str]] = {
    1: ["siem-1"],
    2: ["siem-1", "firewall-1"],
    3: ["siem-1"],
    4: ["identity-1", "user-1", "siem-1"],
}

# Aggressive red team adds extra attacks in phases 2 and 3
AGGRESSIVE_EXTRA: list[tuple[int, AttackSpec, str]] = [
    (2, AttackSpec("credential_spray", Severity.HIGH,   "Simulated credential-spray attack across multiple service accounts", 0.55), "identity-1"),
    (3, AttackSpec("file_enumeration", Severity.MEDIUM, "Simulated recursive file-share enumeration for sensitive documents", 0.60), "fileserver-1"),
]


def _make_config(req: SimulationRequest, resolved_seed: int) -> SimulationConfig:
    return SimulationConfig(
        seed=resolved_seed,
        detection_sensitivity=req.detection_sensitivity,
        honeypot_enabled=req.honeypot_enabled,
        aggressive_red=req.aggressive_red,
    )


# ── Engine ────────────────────────────────────────────────────────────────────

class SimulationEngine:
    """
    Deterministic multi-agent simulation engine.
    Given the same SimulationRequest (with the same seed), always produces
    identical events, node statuses, and metrics.
    """

    def __init__(self) -> None:
        self._base_graph: nx.DiGraph = build_network()

    def run(self, req: SimulationRequest) -> SimulationResult:
        import random as _stdlib_random
        resolved_seed = req.seed if req.seed is not None else _stdlib_random.randint(0, 2**31 - 1)
        rng = Random(resolved_seed)

        config = _make_config(req, resolved_seed)

        run_id     = str(uuid.UUID(int=rng.getrandbits(128)))
        now        = datetime.now(timezone.utc)
        started_at = now.isoformat()

        # Mutable per-run state
        node_status: dict[str, NodeStatus] = {
            nid: NodeStatus.CLEAN for nid in self._base_graph.nodes
        }

        events: list[SimulationEvent] = []
        t_ms = 0  # simulated timeline offset in ms

        red_phase_node_detected: set[tuple[int, str]] = set()
        false_positive_count = 0

        def make_ts(offset_ms: int) -> str:
            return (now + timedelta(milliseconds=offset_ms)).isoformat()

        def make_event(
            agent: AgentTeam,
            action: str,
            node_id: str,
            severity: Severity,
            message: str,
            success: bool,
            phase: int,
        ) -> SimulationEvent:
            evt_id = f"evt-{uuid.UUID(int=rng.getrandbits(128)).hex[:8]}"
            return SimulationEvent(
                id=evt_id,
                timestamp=make_ts(t_ms),
                agent=agent.value,
                action=action,
                node_id=node_id,
                severity=severity.value,
                message=message,
                success=success,
                phase=phase,
            )

        # ── Phase loop ────────────────────────────────────────────────────────
        for phase in range(1, 5):
            attacks = list(PHASE_ATTACKS[phase])
            atk_nodes = list(PHASE_ATTACK_NODES[phase])

            # Inject aggressive extra attacks
            if config.aggressive_red:
                for (p, spec, node) in AGGRESSIVE_EXTRA:
                    if p == phase:
                        attacks.append(spec)
                        atk_nodes.append(node)

            for atk_spec, atk_node in zip(attacks, atk_nodes):
                # Skip honeypot attack if honeypot disabled
                if atk_node == "honeypot-1" and not config.honeypot_enabled:
                    continue

                # Determine if attack succeeds: base_prob modified by node risk_score
                node_data = self._base_graph.nodes.get(atk_node, {})
                node_risk = node_data.get("risk_score", 0.5)
                raw_prob = atk_spec.base_prob * (0.5 + node_risk)
                raw_prob = min(raw_prob, 0.95)

                # Detection sensitivity reduces attack success probability
                effective_prob = raw_prob * (1.0 - config.detection_sensitivity * 0.6)
                attack_succeeded = rng.random() < effective_prob

                evt = make_event(
                    AgentTeam.RED, atk_spec.action, atk_node,
                    atk_spec.severity, atk_spec.message,
                    attack_succeeded, phase,
                )
                events.append(evt)

                # Update node status
                if attack_succeeded:
                    if atk_node == "honeypot-1":
                        node_status[atk_node] = NodeStatus.HONEYPOT_HIT
                    elif node_status[atk_node] == NodeStatus.CLEAN:
                        node_status[atk_node] = NodeStatus.COMPROMISED
                else:
                    if node_status[atk_node] == NodeStatus.CLEAN:
                        node_status[atk_node] = NodeStatus.SUSPICIOUS

                t_ms += rng.randint(300, 900)

                # ── Blue Team response ────────────────────────────────────────
                is_honeypot = atk_node == "honeypot-1"
                detected = (
                    config.honeypot_enabled and is_honeypot
                ) or (rng.random() < config.detection_sensitivity)

                if detected:
                    red_phase_node_detected.add((phase, atk_node))
                    defenses = PHASE_DEFENSES.get(phase, [])
                    def_nodes = PHASE_DEFENSE_NODES.get(phase, [])
                    for def_spec, def_node in zip(defenses, def_nodes):
                        t_ms += rng.randint(150, 500)
                        contain_success = rng.random() < (0.6 + config.detection_sensitivity * 0.3)
                        dev = make_event(
                            AgentTeam.BLUE, def_spec.action, def_node,
                            def_spec.severity, def_spec.message,
                            contain_success, phase,
                        )
                        events.append(dev)
                        if contain_success and node_status.get(atk_node) == NodeStatus.COMPROMISED:
                            node_status[atk_node] = NodeStatus.ISOLATED
                else:
                    # Rare false positive
                    if rng.random() < 0.08:
                        fp_node = rng.choice(["siem-1", "firewall-1"])
                        t_ms += rng.randint(50, 200)
                        events.append(make_event(
                            AgentTeam.BLUE, "false_alarm", fp_node,
                            Severity.LOW, "Blue Team alert triggered but no threat confirmed — false positive",
                            True, phase,
                        ))
                        false_positive_count += 1

                t_ms += rng.randint(200, 600)

        # ── Metrics ───────────────────────────────────────────────────────────
        red_events  = [e for e in events if e.agent == AgentTeam.RED.value]
        threats_generated = len(red_events)
        threats_detected  = len(red_phase_node_detected)
        detection_rate    = round(threats_detected / max(threats_generated, 1), 4)

        blocked = [e for e in red_events if not e.success]
        attacks_blocked = len(blocked)

        compromised_assets = sum(
            1 for s in node_status.values()
            if s in (NodeStatus.COMPROMISED, NodeStatus.ISOLATED)
        )

        data_protected = not any(
            e.action == "data_exfiltration" and e.success
            for e in red_events
        )

        # Deterministic response_time based on seed
        response_time_ms = int(resolved_seed % 400) + 200

        metrics = SimulationMetrics(
            total_events=len(events),
            threats_generated=threats_generated,
            threats_detected=threats_detected,
            detection_rate=detection_rate,
            false_positives=false_positive_count,
            successful_containment=attacks_blocked,
            compromised_assets=compromised_assets,
            data_protected=data_protected,
            attacks_blocked=attacks_blocked,
            simulation_duration_ms=t_ms,
            response_time_ms=response_time_ms,
        )

        completed_at = datetime.now(timezone.utc).isoformat()

        return SimulationResult(
            run_id=run_id,
            status="completed",
            started_at=started_at,
            completed_at=completed_at,
            seed=resolved_seed,
            config=config,
            events=events,
            metrics=metrics,
            node_statuses={k: v.value for k, v in node_status.items()},
        )
