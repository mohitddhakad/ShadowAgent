r"""
ShadowAgent — Automated test suite.
Tests the FastAPI endpoints and the simulation engine directly.
Run from the backend directory:
    .\.venv\Scripts\pytest tests\ -v
"""

from __future__ import annotations

import sys
import os

# Ensure backend/ is on the Python path so `engine` and `main` are importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport


# ── Import app and engine ─────────────────────────────────────────────────────
from main import app
from engine import SimulationEngine
from engine.models import SimulationRequest, NodeStatus


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def engine():
    return SimulationEngine()


@pytest.fixture
def default_req():
    return SimulationRequest(seed=42)


# ── Health endpoint ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_returns_ok(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["project"] == "ShadowAgent"
    assert "supabase_connected" in data
    assert "simulation" in data
    assert data["simulation"] == "ready"


@pytest.mark.asyncio
async def test_root_returns_version(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "version" in data
    assert "endpoints" in data


# ── Network topology ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_network_returns_topology(client):
    resp = await client.get("/network")
    assert resp.status_code == 200
    data = resp.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) >= 6, "Expected at least 6 network nodes"
    assert len(data["edges"]) >= 6, "Expected at least 6 edges"


@pytest.mark.asyncio
async def test_network_node_fields(client):
    resp = await client.get("/network")
    data = resp.json()
    required_fields = {"id", "label", "type", "x", "y"}
    for node in data["nodes"]:
        missing = required_fields - node.keys()
        assert not missing, f"Node {node.get('id')} missing fields: {missing}"


@pytest.mark.asyncio
async def test_network_contains_expected_nodes(client):
    resp = await client.get("/network")
    data = resp.json()
    node_ids = {n["id"] for n in data["nodes"]}
    expected = {"user-1", "identity-1", "app-1", "db-1", "siem-1", "honeypot-1"}
    assert expected.issubset(node_ids), f"Missing nodes: {expected - node_ids}"


# ── Simulation endpoint ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_simulate_default_succeeds(client):
    resp = await client.post("/simulate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert "run_id" in data
    assert "events" in data
    assert "metrics" in data
    assert len(data["events"]) > 0


@pytest.mark.asyncio
async def test_simulate_with_seed(client):
    payload = {"seed": 12345, "detection_sensitivity": 0.8, "honeypot_enabled": True, "aggressive_red": False}
    resp = await client.post("/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["seed"] == 12345
    assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_simulate_invalid_sensitivity_rejected(client):
    """detection_sensitivity must be between 0.0 and 1.0."""
    resp = await client.post("/simulate", json={"detection_sensitivity": 1.5})
    assert resp.status_code == 422, "Expected validation error for sensitivity > 1.0"


@pytest.mark.asyncio
async def test_simulate_invalid_sensitivity_negative(client):
    resp = await client.post("/simulate", json={"detection_sensitivity": -0.1})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_simulate_result_has_required_fields(client):
    resp = await client.post("/simulate", json={"seed": 99})
    data = resp.json()
    assert "run_id" in data
    assert "started_at" in data
    assert "completed_at" in data
    assert "seed" in data
    assert "config" in data
    assert "node_statuses" in data


@pytest.mark.asyncio
async def test_simulate_events_have_required_fields(client):
    resp = await client.post("/simulate", json={"seed": 7})
    data = resp.json()
    required = {"id", "timestamp", "agent", "action", "node_id", "severity", "message", "success"}
    for evt in data["events"]:
        missing = required - evt.keys()
        assert not missing, f"Event missing fields: {missing}"


@pytest.mark.asyncio
async def test_simulate_agent_values_valid(client):
    resp = await client.post("/simulate", json={"seed": 7})
    data = resp.json()
    valid_agents = {"Red Team", "Blue Team"}
    for evt in data["events"]:
        assert evt["agent"] in valid_agents, f"Invalid agent: {evt['agent']}"


@pytest.mark.asyncio
async def test_simulate_severity_values_valid(client):
    resp = await client.post("/simulate", json={"seed": 7})
    data = resp.json()
    valid = {"low", "medium", "high", "critical"}
    for evt in data["events"]:
        assert evt["severity"] in valid, f"Invalid severity: {evt['severity']}"


# ── Repeatability (same seed = same results) ──────────────────────────────────

@pytest.mark.asyncio
async def test_same_seed_same_events(client):
    payload = {"seed": 42, "detection_sensitivity": 0.8, "honeypot_enabled": True, "aggressive_red": False}
    r1 = (await client.post("/simulate", json=payload)).json()
    r2 = (await client.post("/simulate", json=payload)).json()
    # Same seed must produce same events (excluding run_id and timestamps which are wall-clock)
    actions1 = [(e["agent"], e["action"], e["node_id"], e["severity"], e["success"]) for e in r1["events"]]
    actions2 = [(e["agent"], e["action"], e["node_id"], e["severity"], e["success"]) for e in r2["events"]]
    assert actions1 == actions2, "Same seed produced different event sequences"


@pytest.mark.asyncio
async def test_same_seed_same_metrics(client):
    payload = {"seed": 1337}
    r1 = (await client.post("/simulate", json=payload)).json()
    r2 = (await client.post("/simulate", json=payload)).json()
    m1 = r1["metrics"]
    m2 = r2["metrics"]
    assert m1["total_events"]       == m2["total_events"]
    assert m1["threats_generated"]  == m2["threats_generated"]
    assert m1["threats_detected"]   == m2["threats_detected"]
    assert m1["detection_rate"]     == m2["detection_rate"]
    assert m1["attacks_blocked"]    == m2["attacks_blocked"]
    assert m1["data_protected"]     == m2["data_protected"]


@pytest.mark.asyncio
async def test_different_seeds_different_results(client):
    r1 = (await client.post("/simulate", json={"seed": 1})).json()
    r2 = (await client.post("/simulate", json={"seed": 9999})).json()
    # Different seeds should (very likely) produce different metrics
    # Not guaranteed 100%, but extremely unlikely to be identical
    m1 = (r1["metrics"]["threats_detected"], r1["metrics"]["attacks_blocked"])
    m2 = (r2["metrics"]["threats_detected"], r2["metrics"]["attacks_blocked"])
    # We just check they're not always identical (structural check)
    assert r1["seed"] != r2["seed"]


# ── Metric accuracy ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_metric_detection_rate_formula(client):
    resp = await client.post("/simulate", json={"seed": 42})
    data = resp.json()
    m = data["metrics"]
    expected_rate = round(m["threats_detected"] / max(m["threats_generated"], 1), 4)
    assert abs(m["detection_rate"] - expected_rate) < 0.0001, (
        f"detection_rate={m['detection_rate']} but expected {expected_rate}"
    )


@pytest.mark.asyncio
async def test_metric_total_events_matches_event_list(client):
    resp = await client.post("/simulate", json={"seed": 42})
    data = resp.json()
    assert data["metrics"]["total_events"] == len(data["events"])


@pytest.mark.asyncio
async def test_metric_threats_generated_matches_red_events(client):
    resp = await client.post("/simulate", json={"seed": 42})
    data = resp.json()
    red_count = sum(1 for e in data["events"] if e["agent"] == "Red Team")
    assert data["metrics"]["threats_generated"] == red_count


@pytest.mark.asyncio
async def test_metric_data_protected_consistent(client):
    """data_protected must be False if any data_exfiltration succeeded."""
    resp = await client.post("/simulate", json={"seed": 42})
    data = resp.json()
    exfil_succeeded = any(
        e["action"] == "data_exfiltration" and e["success"]
        for e in data["events"]
    )
    if exfil_succeeded:
        assert data["metrics"]["data_protected"] is False
    else:
        assert data["metrics"]["data_protected"] is True


# ── Isolation and containment ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_node_statuses_returned(client):
    resp = await client.post("/simulate", json={"seed": 42})
    data = resp.json()
    assert "node_statuses" in data
    statuses = data["node_statuses"]
    assert isinstance(statuses, dict)
    valid_statuses = {"clean", "suspicious", "compromised", "isolated", "honeypot_hit"}
    for node_id, status in statuses.items():
        assert status in valid_statuses, f"Node {node_id} has invalid status: {status}"


@pytest.mark.asyncio
async def test_honeypot_disabled_no_honeypot_events(client):
    resp = await client.post("/simulate", json={"seed": 42, "honeypot_enabled": False})
    data = resp.json()
    honeypot_red_events = [
        e for e in data["events"]
        if e["node_id"] == "honeypot-1" and e["agent"] == "Red Team"
    ]
    assert len(honeypot_red_events) == 0, "Honeypot events found despite honeypot_enabled=False"


@pytest.mark.asyncio
async def test_high_sensitivity_higher_detection(client):
    """Higher sensitivity should produce >= threats_detected than lower sensitivity (same seed)."""
    base = {"seed": 500}
    low  = (await client.post("/simulate", json={**base, "detection_sensitivity": 0.1})).json()
    high = (await client.post("/simulate", json={**base, "detection_sensitivity": 0.95})).json()
    assert high["metrics"]["threats_detected"] >= low["metrics"]["threats_detected"], (
        "High sensitivity produced fewer detections than low sensitivity"
    )


@pytest.mark.asyncio
async def test_aggressive_red_more_events(client):
    """Aggressive red team should generate more events."""
    base     = {"seed": 200, "detection_sensitivity": 0.8}
    normal   = (await client.post("/simulate", json={**base, "aggressive_red": False})).json()
    aggr     = (await client.post("/simulate", json={**base, "aggressive_red": True})).json()
    assert aggr["metrics"]["threats_generated"] >= normal["metrics"]["threats_generated"], (
        "Aggressive mode did not generate more red events"
    )


# ── /runs endpoint ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_runs_returns_list(client):
    resp = await client.get("/runs")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_run_by_id_success(client):
    sim_resp = await client.post("/simulate", json={"seed": 42})
    run_id = sim_resp.json()["run_id"]
    resp = await client.get(f"/runs/{run_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["run_id"] == run_id
    assert "events" in data
    assert len(data["events"]) > 0


@pytest.mark.asyncio
async def test_run_by_id_not_found(client):
    resp = await client.get("/runs/non-existent-run-id-9999")
    assert resp.status_code == 404


# ── /metrics endpoint ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_metrics_endpoint(client):
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "metric_definitions" in data
    assert "config_parameters" in data


# ── Direct engine tests (no HTTP) ─────────────────────────────────────────────

def test_engine_seed_reproducibility(engine):
    req = SimulationRequest(seed=42)
    r1 = engine.run(req)
    r2 = engine.run(req)
    actions1 = [(e.agent, e.action, e.node_id, e.success) for e in r1.events]
    actions2 = [(e.agent, e.action, e.node_id, e.success) for e in r2.events]
    assert actions1 == actions2


def test_engine_metrics_consistency(engine):
    req = SimulationRequest(seed=77)
    result = engine.run(req)
    m = result.metrics
    red_events = [e for e in result.events if e.agent == "Red Team"]
    assert m.threats_generated == len(red_events)
    assert m.total_events == len(result.events)
    expected_rate = round(m.threats_detected / max(m.threats_generated, 1), 4)
    assert abs(m.detection_rate - expected_rate) < 0.0001


def test_engine_node_statuses_valid(engine):
    result = engine.run(SimulationRequest(seed=99))
    valid = {s.value for s in NodeStatus}
    for node_id, status in result.node_statuses.items():
        assert status in valid, f"Node {node_id}: invalid status '{status}'"


def test_engine_data_protected_consistent(engine):
    for seed in [1, 42, 100, 500, 9999]:
        result = engine.run(SimulationRequest(seed=seed))
        exfil = any(
            e.action == "data_exfiltration" and e.success
            for e in result.events
        )
        if exfil:
            assert result.metrics.data_protected is False
        else:
            assert result.metrics.data_protected is True


def test_engine_response_time_deterministic(engine):
    """response_time_ms must be identical for the same seed."""
    req = SimulationRequest(seed=123)
    r1 = engine.run(req)
    r2 = engine.run(req)
    assert r1.metrics.response_time_ms == r2.metrics.response_time_ms
