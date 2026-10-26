r"""
Tests for ShadowAgent Simulation Lab & Event Timeline workflow:
1. Successful simulation submission with various configurations.
2. Verification that runs persist and can be retrieved by run_id.
3. Verification that events and nodes are strictly scoped to the specific run.
4. Validation and error handling for invalid simulation inputs.
"""

from __future__ import annotations

import sys
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from engine.models import SimulationRequest


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_workflow_submission_and_run_isolation(client):
    """
    Submitting two different simulations with distinct seeds must produce
    distinct run IDs, distinct metrics, and distinct event logs that do not leak
    between runs.
    """
    # 1. Execute Run A
    payload_a = {
        "seed": 101,
        "detection_sensitivity": 0.9,
        "honeypot_enabled": True,
        "aggressive_red": False,
    }
    resp_a = await client.post("/simulate", json=payload_a)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    run_id_a = data_a["run_id"]
    events_a = data_a["events"]
    assert len(events_a) > 0

    # 2. Execute Run B with different seed & aggressive tactics
    payload_b = {
        "seed": 202,
        "detection_sensitivity": 0.4,
        "honeypot_enabled": False,
        "aggressive_red": True,
    }
    resp_b = await client.post("/simulate", json=payload_b)
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    run_id_b = data_b["run_id"]
    events_b = data_b["events"]
    assert len(events_b) > 0

    # Ensure IDs and metrics are distinct
    assert run_id_a != run_id_b
    assert data_a["seed"] == 101
    assert data_b["seed"] == 202

    # 3. Retrieve Run A specifically
    get_a = await client.get(f"/runs/{run_id_a}")
    assert get_a.status_code == 200
    detail_a = get_a.json()
    assert detail_a["run_id"] == run_id_a
    assert len(detail_a["events"]) == len(events_a)
    # Ensure no events from Run B appear in Run A
    action_sequence_a = [e["action"] for e in detail_a["events"]]
    expected_actions_a = [e["action"] for e in events_a]
    assert action_sequence_a == expected_actions_a

    # 4. Retrieve Run B specifically
    get_b = await client.get(f"/runs/{run_id_b}")
    assert get_b.status_code == 200
    detail_b = get_b.json()
    assert detail_b["run_id"] == run_id_b
    assert len(detail_b["events"]) == len(events_b)
    action_sequence_b = [e["action"] for e in detail_b["events"]]
    expected_actions_b = [e["action"] for e in events_b]
    assert action_sequence_b == expected_actions_b


@pytest.mark.asyncio
async def test_workflow_honeypot_isolation(client):
    """
    When honeypot is disabled, the honeypot-1 node must not be targeted
    by Red Team in the run's event sequence.
    """
    payload_no_hp = {"seed": 42, "honeypot_enabled": False}
    resp = await client.post("/simulate", json=payload_no_hp)
    assert resp.status_code == 200
    events = resp.json()["events"]
    hp_events = [e for e in events if e["node_id"] == "honeypot-1" and e["agent"] == "Red Team"]
    assert len(hp_events) == 0


@pytest.mark.asyncio
async def test_workflow_validation_errors(client):
    """
    Invalid payloads return 422 Unprocessable Entity.
    """
    # Sensitivity above 1.0
    r1 = await client.post("/simulate", json={"detection_sensitivity": 1.5})
    assert r1.status_code == 422

    # Sensitivity below 0.0
    r2 = await client.post("/simulate", json={"detection_sensitivity": -0.5})
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_workflow_persistence_status_reported(client):
    """
    The simulation response must report whether it was persisted and through which backend.
    """
    resp = await client.post("/simulate", json={"seed": 777})
    assert resp.status_code == 200
    data = resp.json()
    assert "persisted" in data
    assert "persistence_backend" in data
    assert data["persistence_backend"] in ("supabase", "in_memory")
