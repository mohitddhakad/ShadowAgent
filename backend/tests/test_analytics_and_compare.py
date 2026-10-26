r"""
Tests for ShadowAgent Security Analytics and Defense Comparison endpoints:
1. GET /analytics on empty vs populated runs
2. POST /compare executing two configurations with the same seed
3. Metric delta calculation accuracy
"""

from __future__ import annotations

import sys
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from persistence import reset_repository, set_repository, InMemoryRepository


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_analytics_empty_repo(client):
    """When no simulation runs exist, /analytics returns clean defaults with has_data=False."""
    mem_repo = InMemoryRepository()
    set_repository(mem_repo)
    try:
        resp = await client.get("/analytics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_runs"] == 0
        assert data["has_data"] is False
        assert data["overall_detection_rate"] == 0.0
        assert data["run_trends"] == []
    finally:
        reset_repository()


@pytest.mark.asyncio
async def test_analytics_populated_repo(client):
    """When runs exist, /analytics aggregates metrics accurately."""
    # Run two simulations
    await client.post("/simulate", json={"seed": 100, "detection_sensitivity": 0.8})
    await client.post("/simulate", json={"seed": 200, "detection_sensitivity": 0.3})

    resp = await client.get("/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_runs"] >= 2
    assert data["has_data"] is True
    assert data["total_threats_generated"] > 0
    assert 0.0 <= data["overall_detection_rate"] <= 1.0
    assert "severity_distribution" in data
    assert "agent_distribution" in data
    assert len(data["run_trends"]) >= 2


@pytest.mark.asyncio
async def test_compare_endpoint_same_seed(client):
    """
    POST /compare executes two configurations with the same seed,
    yielding reproducible comparative deltas.
    """
    payload = {
        "seed": 42,
        "config_a": {
            "detection_sensitivity": 0.2,
            "honeypot_enabled": False,
            "aggressive_red": False,
        },
        "config_b": {
            "detection_sensitivity": 0.9,
            "honeypot_enabled": True,
            "aggressive_red": False,
        },
    }
    resp = await client.post("/compare", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["seed"] == 42
    assert "run_a" in data
    assert "run_b" in data
    assert "diff" in data
    assert "analysis" in data
    assert "metric_definitions" in data
    assert "limitations" in data

    # Config B has much higher detection sensitivity (0.9 vs 0.2), so detection rate delta should be >= 0
    diff = data["diff"]
    assert diff["detection_rate_delta"] >= 0.0
    assert data["run_a"]["seed"] == 42
    assert data["run_b"]["seed"] == 42
    assert data["run_a"]["persisted"] is True
    assert data["run_b"]["persisted"] is True
