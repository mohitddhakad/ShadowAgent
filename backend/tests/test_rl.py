r"""
Tests for ShadowAgent Reinforcement Learning Foundation:
1. Gymnasium environment observation and action spaces
2. Reset behavior and deterministic seeding
3. Step transitions, phase progression, and termination
4. Rule-based vs Random baseline evaluation
5. Training smoke test and API endpoints
"""

from __future__ import annotations

import sys
import os
import pytest
import pytest_asyncio
import numpy as np
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from rl.env import CyberDefenseEnv, NODE_LIST, ACTION_NAMES
from rl.agent import RuleBasedDefender, RandomDefender, evaluate_agent, train_ppo_agent


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def test_env_spaces():
    """Verify Gymnasium space specifications."""
    env = CyberDefenseEnv()
    assert env.observation_space.shape == (11,)
    assert env.observation_space.dtype == np.float32
    assert env.action_space.n == 6
    assert len(NODE_LIST) == 9
    assert len(ACTION_NAMES) == 6


def test_env_deterministic_reset():
    """Identical seeds must yield identical reset observations."""
    env1 = CyberDefenseEnv(seed=42)
    obs1, info1 = env1.reset(seed=42)

    env2 = CyberDefenseEnv(seed=42)
    obs2, info2 = env2.reset(seed=42)

    np.testing.assert_allclose(obs1, obs2)
    assert info1["phase"] == info2["phase"]


def test_env_step_progression_and_termination():
    """Environment advances phase each step and terminates at step 4 (after phase 4)."""
    env = CyberDefenseEnv(seed=123)
    obs, info = env.reset(seed=123)
    assert info["phase"] == 1

    total_reward = 0.0
    terminated = False
    truncated = False
    steps = 0

    while not (terminated or truncated):
        obs, reward, terminated, truncated, info = env.step(0)  # passive monitor
        total_reward += reward
        steps += 1
        assert len(obs) == 11
        if not terminated:
            assert info["phase"] == steps + 1

    assert steps <= 4
    assert terminated is True


def test_baseline_evaluation_produces_real_metrics():
    """Evaluation returns real calculated numbers for both heuristic and random defenders."""
    env = CyberDefenseEnv()
    rule_agent = RuleBasedDefender()
    rule_metrics = evaluate_agent(rule_agent, env, n_episodes=5, seed_offset=100)

    assert rule_metrics["episodes_evaluated"] == 5
    assert isinstance(rule_metrics["mean_reward"], float)
    assert 0.0 <= rule_metrics["data_protection_rate"] <= 1.0

    random_agent = RandomDefender(env.action_space)
    rand_metrics = evaluate_agent(random_agent, env, n_episodes=5, seed_offset=100)
    assert rand_metrics["episodes_evaluated"] == 5
    assert isinstance(rand_metrics["mean_reward"], float)


def test_ppo_training_smoke_test(tmp_path):
    """Smoke test: train PPO for a tiny timestep count and verify artifact is saved."""
    test_model_file = str(tmp_path / "smoke_ppo.zip")
    res = train_ppo_agent(total_timesteps=200, seed=42, model_path=test_model_file)

    assert res["status"] == "completed"
    assert os.path.exists(test_model_file)
    assert "evaluation" in res
    assert "rule_based_baseline" in res["evaluation"]


@pytest.mark.asyncio
async def test_rl_api_status(client):
    """GET /rl/status returns environment specifications and model status."""
    resp = await client.get("/rl/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert "environment_spec" in data
    assert "reward_function" in data["environment_spec"]
    assert "limitations" in data


@pytest.mark.asyncio
async def test_rl_api_evaluate(client):
    """POST /rl/evaluate returns benchmark evaluation."""
    resp = await client.post("/rl/evaluate?n_episodes=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "rule_based_baseline" in data
    assert "random_baseline" in data
    assert data["rule_based_baseline"]["episodes_evaluated"] == 5
