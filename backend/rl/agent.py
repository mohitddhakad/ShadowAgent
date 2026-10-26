"""
Reinforcement Learning Agent & Evaluation Module.

Provides:
- Rule-based baseline defender (heuristic)
- Random baseline defender
- Stable-Baselines3 PPO training pipeline
- Empirical evaluation and comparative benchmarking
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple, Union

import numpy as np
from stable_baselines3 import PPO

from .env import ACTION_NAMES, CyberDefenseEnv, NODE_LIST


MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
DEFAULT_MODEL_PATH = os.path.join(MODEL_DIR, "ppo_defense.zip")


# ── Baseline Agents ───────────────────────────────────────────────────────────

class RuleBasedDefender:
    """
    Heuristic rule-based Blue Team agent.
    Acts on visible node states using fixed cybersecurity heuristics.
    """

    def predict(self, obs: np.ndarray, deterministic: bool = True) -> Tuple[int, None]:
        # obs indices: 0..8 node states, 9 honeypot, 10 phase
        honeypot_tripped = obs[9] > 0.5
        phase_normalized = obs[10]

        # Phase 3 or 4: Emergency database protection or isolation
        if phase_normalized >= 0.75 or honeypot_tripped:
            return 4, None  # LOCKDOWN_DATABASE

        # Phase 2: Lateral movement containment on app server
        if phase_normalized >= 0.50:
            return 3, None  # ISOLATE_APP_SERVER

        # Phase 1: Check workstation and identity states
        user_state = obs[1]      # user-1
        identity_state = obs[3]  # identity-1

        if user_state >= 0.25:
            return 1, None  # ISOLATE_WORKSTATION
        if identity_state >= 0.25:
            return 2, None  # FREEZE_IDENTITY_SESSION

        return 0, None  # PASSIVE_MONITOR


class RandomDefender:
    """Random action baseline agent for empirical grounding."""

    def __init__(self, action_space: Any) -> None:
        self.action_space = action_space

    def predict(self, obs: np.ndarray, deterministic: bool = True) -> Tuple[int, None]:
        return int(self.action_space.sample()), None


# ── Evaluation ────────────────────────────────────────────────────────────────

def evaluate_agent(
    agent: Any,
    env: CyberDefenseEnv,
    n_episodes: int = 25,
    seed_offset: int = 1000,
) -> Dict[str, Any]:
    """
    Empirically evaluate an agent policy over n_episodes with deterministic seeds.
    Returns real measured metrics.
    """
    rewards: list[float] = []
    protected_count = 0
    total_blocked = 0
    total_false_isolations = 0

    for ep in range(n_episodes):
        ep_seed = seed_offset + ep
        obs, info = env.reset(seed=ep_seed)
        ep_reward = 0.0
        terminated = False
        truncated = False

        while not (terminated or truncated):
            action, _ = agent.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(int(action))
            ep_reward += reward

        rewards.append(ep_reward)
        if info.get("data_protected", False):
            protected_count += 1
        total_blocked += info.get("attacks_blocked", 0)
        total_false_isolations += info.get("false_isolations", 0)

    mean_reward = float(np.mean(rewards)) if rewards else 0.0
    std_reward = float(np.std(rewards)) if rewards else 0.0
    prot_rate = float(protected_count / max(n_episodes, 1))

    return {
        "episodes_evaluated": n_episodes,
        "mean_reward": round(mean_reward, 2),
        "std_reward": round(std_reward, 2),
        "data_protection_rate": round(prot_rate, 4),
        "avg_attacks_blocked": round(float(total_blocked / max(n_episodes, 1)), 2),
        "avg_false_isolations": round(float(total_false_isolations / max(n_episodes, 1)), 2),
    }


# ── Training ──────────────────────────────────────────────────────────────────

def train_ppo_agent(
    total_timesteps: int = 5000,
    seed: int = 42,
    model_path: str = DEFAULT_MODEL_PATH,
) -> Dict[str, Any]:
    """
    Train a Stable-Baselines3 PPO policy on CyberDefenseEnv.
    Saves model artifact locally (ignored by Git).
    """
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    env = CyberDefenseEnv(seed=seed)

    model = PPO(
        policy="MlpPolicy",
        env=env,
        learning_rate=0.001,
        n_steps=64,
        batch_size=32,
        gamma=0.95,
        verbose=0,
        seed=seed,
    )

    started_at = datetime.now(timezone.utc).isoformat()
    model.learn(total_timesteps=total_timesteps)
    completed_at = datetime.now(timezone.utc).isoformat()

    model.save(model_path)

    # Evaluate the newly trained model against baseline
    eval_results = evaluate_policy_against_baseline(
        model_path=model_path,
        n_episodes=20,
    )

    return {
        "status": "completed",
        "algorithm": "PPO (Proximal Policy Optimization)",
        "policy_type": "MlpPolicy",
        "total_timesteps": total_timesteps,
        "seed": seed,
        "saved_path": os.path.basename(model_path),
        "started_at": started_at,
        "completed_at": completed_at,
        "evaluation": eval_results,
    }


# ── Comparative Benchmark ─────────────────────────────────────────────────────

def evaluate_policy_against_baseline(
    model_path: Optional[str] = DEFAULT_MODEL_PATH,
    n_episodes: int = 25,
) -> Dict[str, Any]:
    """
    Compare RL agent, Rule-Based Defender, and Random Baseline under identical seeds.
    """
    env = CyberDefenseEnv()
    results: Dict[str, Any] = {}

    # 1. Rule-Based Defender
    rule_agent = RuleBasedDefender()
    results["rule_based_baseline"] = evaluate_agent(
        rule_agent, env, n_episodes=n_episodes, seed_offset=5000
    )

    # 2. Random Defender
    random_agent = RandomDefender(env.action_space)
    results["random_baseline"] = evaluate_agent(
        random_agent, env, n_episodes=n_episodes, seed_offset=5000
    )

    # 3. RL Trained Agent
    target_path = model_path or DEFAULT_MODEL_PATH
    if os.path.exists(target_path):
        try:
            rl_model = PPO.load(target_path, env=env)
            results["rl_trained_agent"] = evaluate_agent(
                rl_model, env, n_episodes=n_episodes, seed_offset=5000
            )
            results["rl_model_loaded"] = True
        except Exception as exc:
            results["rl_trained_agent"] = None
            results["rl_model_loaded"] = False
            results["rl_error"] = str(exc)
    else:
        results["rl_trained_agent"] = None
        results["rl_model_loaded"] = False

    return results


def get_rl_status() -> Dict[str, Any]:
    """Return status and specifications of the RL defense module."""
    model_exists = os.path.exists(DEFAULT_MODEL_PATH)
    model_info = None

    if model_exists:
        stat = os.stat(DEFAULT_MODEL_PATH)
        model_info = {
            "file": os.path.basename(DEFAULT_MODEL_PATH),
            "size_kb": round(stat.st_size / 1024, 1),
            "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        }

    return {
        "status": "ready",
        "framework": "Gymnasium + Stable-Baselines3",
        "algorithm": "PPO (Proximal Policy Optimization)",
        "model_trained": model_exists,
        "model_details": model_info,
        "environment_spec": {
            "observation_space": "Box(11,) float in [0.0, 1.0]",
            "observation_description": [
                "0-8: Security status of 9 nodes (0.0: clean, 0.25: suspicious, 0.50: compromised, 0.75: isolated, 1.0: honeypot)",
                "9: Honeypot triggered flag (0.0 or 1.0)",
                "10: Attack phase progression (0.25 to 1.0)",
            ],
            "action_space": "Discrete(6)",
            "actions": ACTION_NAMES,
            "reward_function": {
                "containment_reward": "+8.0 for isolating an actively compromised or targeted asset",
                "honeypot_alert_reward": "+5.0 for early warning from decoy server",
                "false_positive_penalty": "-2.0 for isolating a clean non-targeted asset",
                "database_breach_penalty": "-10.0 for uncontained data access",
                "step_cost": "-0.2 latency penalty per action",
                "mission_terminal_bonus": "+15.0 if data protected at end of attack",
                "mission_terminal_penalty": "-15.0 if database exfiltrated",
            },
        },
        "limitations": [
            "Discrete abstract state space — does not interface with physical packets or real networks.",
            "Attacker policy uses seeded stochastic transitions rather than an adversarial multi-agent game.",
            "Actions represent high-level containment abstractions rather than specific host agent commands.",
        ],
    }
