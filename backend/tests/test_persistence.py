r"""
ShadowAgent — Persistence Layer Test Suite.
Tests database operations, SupabaseRepository, InMemoryRepository,
error recovery, and credential safety without requiring an active database connection.
"""

from __future__ import annotations

import sys
import os
from unittest.mock import MagicMock, patch

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from main import app
from engine import SimulationEngine, get_topology_response
from engine.models import SimulationRequest
from persistence import (
    config,
    get_repository,
    set_repository,
    reset_repository,
    InMemoryRepository,
    SupabaseRepository,
)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def clean_repository_state():
    """Ensure each test runs with a fresh repository state."""
    reset_repository()
    yield
    reset_repository()


# ── Credential Safety Tests ───────────────────────────────────────────────────

def test_config_credentials_not_leaked_in_repr():
    """Ensure __repr__ and __str__ never output raw secrets."""
    config_repr = repr(config)
    config_str = str(config)
    assert "your-service-role" not in config_repr
    assert "your-secret-key" not in config_repr
    assert "configured" in config_repr.lower()
    assert "configured" in config_str.lower()


def test_config_placeholder_detection():
    """Verify that placeholder credentials are classified as unconfigured."""
    from persistence.config import _is_placeholder
    assert _is_placeholder("https://your-project.supabase.co") is True
    assert _is_placeholder("your-service-role-key-here") is True
    assert _is_placeholder("") is True
    assert _is_placeholder(None) is True
    assert _is_placeholder("sb_secret_real_production_key_123456789") is False


# ── In-Memory Repository Lifecycle Tests ──────────────────────────────────────

def test_in_memory_repository_complete_flow():
    repo = InMemoryRepository()
    engine = SimulationEngine()
    topology = get_topology_response()
    result = engine.run(SimulationRequest(seed=42))

    # 1. Create run
    assert repo.create_run(result.run_id, result.started_at) is True

    # 2. Save nodes
    assert repo.save_network_nodes(result.run_id, topology.nodes, result.node_statuses) is True
    saved_nodes = repo.nodes[result.run_id]
    assert len(saved_nodes) == len(topology.nodes)
    for n in saved_nodes:
        assert n["simulation_run_id"] == result.run_id
        assert "node_key" in n
        assert "label" in n
        assert "node_type" in n
        assert "metadata" in n
        assert "status" in n["metadata"]

    # 3. Save events
    assert repo.save_events(result.run_id, result.events) is True
    saved_events = repo.events[result.run_id]
    assert len(saved_events) == len(result.events)
    for e in saved_events:
        assert e["simulation_run_id"] == result.run_id
        assert "occurred_at" in e
        assert "agent" in e
        assert "severity" in e
        assert "message" in e
        assert "node_key" in e
        assert "action" in e
        assert "details" in e

    # 4. Complete run
    assert repo.complete_run(result.run_id, result.completed_at, result.metrics, "completed") is True

    # 5. Retrieve run
    fetched = repo.get_run(result.run_id)
    assert fetched is not None
    assert fetched["run_id"] == result.run_id
    assert fetched["status"] == "completed"
    assert len(fetched["nodes"]) == len(topology.nodes)
    assert len(fetched["events"]) == len(result.events)

    # 6. List runs
    runs_list = repo.list_runs()
    assert len(runs_list) >= 1
    assert runs_list[0]["run_id"] == result.run_id


def test_in_memory_repository_fail_run():
    repo = InMemoryRepository()
    run_id = "test-fail-run-1"
    repo.create_run(run_id, "2026-10-26T12:00:00Z")
    assert repo.fail_run(run_id, "Simulated database write error") is True

    run = repo.get_run(run_id)
    assert run is not None
    assert run["status"] == "failed"
    assert "error" in run["metrics"]


# ── Supabase Repository Tests with Mocked Client ──────────────────────────────

def test_supabase_repository_create_run_payload():
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.upsert.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[{"id": "run-1"}])

    repo = SupabaseRepository(mock_client)
    success = repo.create_run("run-1", "2026-10-26T10:00:00Z")
    assert success is True

    mock_client.table.assert_called_with("simulation_runs")
    mock_table.upsert.assert_called_once()
    payload = mock_table.upsert.call_args[0][0]
    assert payload["id"] == "run-1"
    assert payload["status"] == "in_progress"
    assert payload["started_at"] == "2026-10-26T10:00:00Z"
    assert payload["metrics"] == {}


def test_supabase_repository_save_nodes_matches_schema():
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[])

    repo = SupabaseRepository(mock_client)
    nodes = [
        {"id": "user-1", "label": "Workstation", "type": "user", "risk_score": 0.2, "x": 100, "y": 200, "description": "Desc"}
    ]
    node_statuses = {"user-1": "compromised"}

    success = repo.save_network_nodes("run-123", nodes, node_statuses)
    assert success is True

    mock_client.table.assert_any_call("network_nodes")
    mock_table.insert.assert_called_once()
    records = mock_table.insert.call_args[0][0]
    assert len(records) == 1
    r = records[0]
    assert r["simulation_run_id"] == "run-123"
    assert r["node_key"] == "user-1"
    assert r["label"] == "Workstation"
    assert r["node_type"] == "user"
    assert r["metadata"]["status"] == "compromised"
    assert r["metadata"]["risk_score"] == 0.2


def test_supabase_repository_save_events_matches_schema():
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[])

    repo = SupabaseRepository(mock_client)
    events = [
        {
            "id": "evt-abc",
            "timestamp": "2026-10-26T10:01:00Z",
            "agent": "Red Team",
            "severity": "high",
            "message": "Phishing email clicked",
            "node_id": "user-1",
            "action": "phishing_attempt",
            "success": True,
            "phase": 1,
        }
    ]

    success = repo.save_events("run-123", events)
    assert success is True

    mock_client.table.assert_any_call("simulation_events")
    mock_table.insert.assert_called_once()
    records = mock_table.insert.call_args[0][0]
    assert len(records) == 1
    r = records[0]
    assert r["simulation_run_id"] == "run-123"
    assert r["occurred_at"] == "2026-10-26T10:01:00Z"
    assert r["agent"] == "Red Team"
    assert r["severity"] == "high"
    assert r["node_key"] == "user-1"
    assert r["action"] == "phishing_attempt"
    assert r["details"]["success"] is True
    assert r["details"]["phase"] == 1


def test_supabase_repository_handles_network_failure():
    """Verify that database errors do not crash the repository."""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.upsert.side_effect = ConnectionError("Supabase connection timed out")

    repo = SupabaseRepository(mock_client)
    success = repo.create_run("run-error-test", "2026-10-26T10:00:00Z")
    assert success is False, "Repository should gracefully return False on database error"


# ── HTTP API Integration Tests with Injected Repositories ────────────────────

@pytest.mark.asyncio
async def test_simulate_persists_to_in_memory_by_default(client):
    in_mem_repo = InMemoryRepository()
    set_repository(in_mem_repo)

    resp = await client.post("/simulate", json={"seed": 42})
    assert resp.status_code == 200
    data = resp.json()

    assert data["persisted"] is True
    assert data["persistence_backend"] == "in_memory"
    assert "Saved to in-memory session cache" in data["persistence_message"]

    # Verify run was saved in repository
    run_id = data["run_id"]
    assert run_id in in_mem_repo.runs
    assert len(in_mem_repo.events[run_id]) > 0
    assert len(in_mem_repo.nodes[run_id]) > 0


@pytest.mark.asyncio
async def test_simulate_with_mocked_supabase_success(client):
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.upsert.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[])

    supabase_repo = SupabaseRepository(mock_client)
    set_repository(supabase_repo)

    resp = await client.post("/simulate", json={"seed": 99})
    assert resp.status_code == 200
    data = resp.json()

    assert data["persisted"] is True
    assert data["persistence_backend"] == "supabase"
    assert "Successfully saved to Supabase" in data["persistence_message"]


@pytest.mark.asyncio
async def test_simulate_with_failing_database_sets_persisted_false(client):
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    # Make insert raise a simulated DB failure
    mock_table.upsert.side_effect = RuntimeError("PostgREST table constraint violation")
    mock_table.update.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[])

    supabase_repo = SupabaseRepository(mock_client)
    set_repository(supabase_repo)

    resp = await client.post("/simulate", json={"seed": 100})
    assert resp.status_code == 200
    data = resp.json()

    # Must NOT claim that run was persisted when the database call failed!
    assert data["persisted"] is False
    assert "Persistence error" in data["persistence_message"]


@pytest.mark.asyncio
async def test_health_endpoint_reports_safe_persistence_metadata(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()

    assert "supabase_configured" in data
    assert "supabase_connected" in data
    assert "persistence_backend" in data
    assert "persistence_status" in data
    # Ensure no secrets leaked
    assert "key" not in str(data).lower() or "persistence_status" in str(data)
    assert "secret" not in str(data).lower()


@pytest.mark.asyncio
async def test_get_run_by_id_returns_run_nodes_and_events(client):
    repo = InMemoryRepository()
    set_repository(repo)

    # 1. Run simulation
    sim_resp = await client.post("/simulate", json={"seed": 42})
    run_id = sim_resp.json()["run_id"]

    # 2. Fetch run by ID
    get_resp = await client.get(f"/runs/{run_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()

    assert data["run_id"] == run_id
    assert "run" in data
    assert "nodes" in data
    assert "events" in data
    assert len(data["nodes"]) >= 8
    assert len(data["events"]) >= 10

    # Verify node fields match expected schema
    first_node = data["nodes"][0]
    assert "node_key" in first_node
    assert "label" in first_node
    assert "node_type" in first_node
    assert "metadata" in first_node

    # Verify event fields match expected schema
    first_event = data["events"][0]
    assert "occurred_at" in first_event
    assert "agent" in first_event
    assert "severity" in first_event
    assert "message" in first_event
    assert "node_key" in first_event
    assert "action" in first_event
    assert "details" in first_event
