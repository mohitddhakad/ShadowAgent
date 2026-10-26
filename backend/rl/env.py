"""
Gymnasium Environment for ShadowAgent Cybersecurity Simulation.

Educational, isolated Reinforcement Learning environment where an autonomous
Blue Team defense agent observes network telemetry and selects defensive
containment actions against a simulated multi-phase Red Team attacker.

Observation Space:
    Box(11,) in [0.0, 1.0], representing:
    - Indices 0..8: Normalized security state of 9 fictional network nodes
        (0.0: CLEAN, 0.25: SUSPICIOUS, 0.5: COMPROMISED, 0.75: ISOLATED, 1.0: HONEYPOT_HIT)
    - Index 9: Honeypot tripped flag (0.0 or 1.0)
    - Index 10: Current normalized attack phase (0.25, 0.50, 0.75, 1.0)

Action Space:
    Discrete(6):
    0: PASSIVE_MONITOR (observe without intervening)
    1: ISOLATE_WORKSTATION (quarantine user-1 workstation)
    2: FREEZE_IDENTITY_SESSION (restrict identity-1 authentication)
    3: ISOLATE_APP_SERVER (quarantine app-1 application server)
    4: LOCKDOWN_DATABASE (restrict db-1 database server connections)
    5: BLOCK_PERIMETER_FIREWALL (apply perimeter egress block on firewall-1)

Reward Function:
    +8.0  : Successfully isolating an actively compromised or targeted asset.
    +5.0  : Honeypot detection / early warning alert.
    -2.0  : False positive penalty for isolating a clean, non-targeted asset (business friction).
    -10.0 : Uncontained database breach or exfiltration event.
    -0.2  : Per-step latency penalty to incentivize rapid mitigation.
    +15.0 : Episode completion bonus if data remains fully protected.
    -15.0 : Episode penalty if data exfiltration succeeded.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import gymnasium as gym
from gymnasium import spaces


# Ordered list of fictional nodes
NODE_LIST: List[str] = [
    "firewall-1",
    "user-1",
    "user-2",
    "identity-1",
    "app-1",
    "fileserver-1",
    "db-1",
    "siem-1",
    "honeypot-1",
]

# Action mapping
ACTION_NAMES: Dict[int, str] = {
    0: "PASSIVE_MONITOR",
    1: "ISOLATE_WORKSTATION",
    2: "FREEZE_IDENTITY_SESSION",
    3: "ISOLATE_APP_SERVER",
    4: "LOCKDOWN_DATABASE",
    5: "BLOCK_PERIMETER_FIREWALL",
}

# Node affected by each defensive action
ACTION_TARGET_NODE: Dict[int, Optional[str]] = {
    0: None,
    1: "user-1",
    2: "identity-1",
    3: "app-1",
    4: "db-1",
    5: "firewall-1",
}

# State encoding to float
STATE_ENCODING: Dict[str, float] = {
    "clean": 0.0,
    "suspicious": 0.25,
    "compromised": 0.50,
    "isolated": 0.75,
    "honeypot_hit": 1.0,
}


class CyberDefenseEnv(gym.Env):
    """Gymnasium environment modeling enterprise network cyber defense."""

    metadata = {"render_modes": ["ansi", "dict"], "render_fps": 4}

    def __init__(
        self,
        seed: Optional[int] = None,
        honeypot_enabled: bool = True,
        aggressive_red: bool = False,
        render_mode: Optional[str] = None,
    ) -> None:
        super().__init__()

        self.honeypot_enabled = honeypot_enabled
        self.aggressive_red = aggressive_red
        self.render_mode = render_mode

        # 11-dimensional observation vector
        self.observation_space = spaces.Box(
            low=0.0,
            high=1.0,
            shape=(11,),
            dtype=np.float32,
        )

        # 6 discrete Blue Team actions
        self.action_space = spaces.Discrete(6)

        self._rng = np.random.default_rng(seed)
        self.current_phase = 1
        self.node_states: Dict[str, str] = {}
        self.honeypot_tripped = False
        self.data_protected = True
        self.attacks_blocked = 0
        self.threats_generated = 0
        self.false_isolations = 0
        self.events_log: List[Dict[str, Any]] = []

    def _get_obs(self) -> np.ndarray:
        obs = np.zeros(11, dtype=np.float32)
        # Node states 0..8
        for i, node in enumerate(NODE_LIST):
            st = self.node_states.get(node, "clean")
            obs[i] = STATE_ENCODING.get(st, 0.0)

        # Index 9: Honeypot tripped
        obs[9] = 1.0 if self.honeypot_tripped else 0.0

        # Index 10: Normalized attack phase (1=0.25, 2=0.50, 3=0.75, 4=1.0)
        obs[10] = float(self.current_phase) / 4.0

        return obs

    def reset(
        self,
        *,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        super().reset(seed=seed)
        if seed is not None:
            self._rng = np.random.default_rng(seed)

        self.current_phase = 1
        self.node_states = {n: "clean" for n in NODE_LIST}
        self.honeypot_tripped = False
        self.data_protected = True
        self.attacks_blocked = 0
        self.threats_generated = 0
        self.false_isolations = 0
        self.events_log = []

        # Initial background reconnaissance or initial vulnerability exposure
        if self._rng.random() < 0.3:
            self.node_states["user-1"] = "suspicious"

        obs = self._get_obs()
        info = {
            "phase": self.current_phase,
            "data_protected": self.data_protected,
            "attacks_blocked": self.attacks_blocked,
        }
        return obs, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        reward = -0.2  # Step latency cost
        action_name = ACTION_NAMES.get(action, "PASSIVE_MONITOR")
        target_node = ACTION_TARGET_NODE.get(action)

        # ── 1. Simulate Red Team Action for Current Phase ────────────────────
        self.threats_generated += 1
        red_target: str
        if self.current_phase == 1:
            red_target = "user-1" if self._rng.random() < 0.6 else "identity-1"
        elif self.current_phase == 2:
            red_target = "app-1"
        elif self.current_phase == 3:
            if self.honeypot_enabled and self._rng.random() < 0.5:
                red_target = "honeypot-1"
            else:
                red_target = "db-1"
        else:  # Phase 4
            red_target = "db-1"

        # Base probability of attack success
        prob_success = 0.70
        if red_target == "honeypot-1":
            prob_success = 0.90
        elif self.node_states.get(red_target) == "isolated":
            prob_success = 0.0  # Cannot compromise an isolated node

        attack_success = (self._rng.random() < prob_success) if prob_success > 0 else False

        # Apply red attack outcome
        if attack_success:
            if red_target == "honeypot-1":
                self.node_states["honeypot-1"] = "honeypot_hit"
                self.honeypot_tripped = True
                reward += 5.0  # Decoy served its purpose
            else:
                self.node_states[red_target] = "compromised"
                if red_target == "db-1" and self.current_phase == 4:
                    self.data_protected = False
                    reward -= 10.0  # Critical breach penalty
        else:
            if self.node_states.get(red_target) == "clean":
                self.node_states[red_target] = "suspicious"

        # ── 2. Evaluate Blue Team Defense Action ─────────────────────────────
        if target_node is not None:
            current_target_state = self.node_states.get(target_node, "clean")

            if current_target_state in ("compromised", "suspicious"):
                # Effective containment
                self.node_states[target_node] = "isolated"
                self.attacks_blocked += 1
                reward += 8.0
            elif target_node == red_target and attack_success:
                # Intercepted attack in flight
                self.node_states[target_node] = "isolated"
                self.attacks_blocked += 1
                reward += 8.0
            elif current_target_state == "clean":
                # False positive / premature isolation of a clean node
                self.node_states[target_node] = "isolated"
                self.false_isolations += 1
                reward -= 2.0
            # If already isolated, action is redundant (no extra penalty beyond step cost)

        # ── 3. Check Termination and Progression ─────────────────────────────
        self.current_phase += 1
        terminated = self.current_phase > 4 or not self.data_protected
        truncated = False

        if terminated:
            if self.data_protected:
                reward += 15.0  # Mission success bonus
            else:
                reward -= 15.0  # Mission failure penalty

        obs = self._get_obs()
        info = {
            "phase": min(self.current_phase, 4),
            "data_protected": self.data_protected,
            "attacks_blocked": self.attacks_blocked,
            "threats_generated": self.threats_generated,
            "false_isolations": self.false_isolations,
            "honeypot_tripped": self.honeypot_tripped,
            "action_taken": action_name,
            "red_target": red_target,
            "attack_success": attack_success,
        }

        return obs, float(reward), terminated, truncated, info

    def render(self) -> Any:
        if self.render_mode == "ansi":
            lines = [f"--- Phase {self.current_phase} ---"]
            for node in NODE_LIST:
                lines.append(f"  {node}: {self.node_states.get(node, 'clean')}")
            lines.append(f"  Data Protected: {self.data_protected}")
            return "\n".join(lines)
        return {
            "phase": self.current_phase,
            "node_states": dict(self.node_states),
            "data_protected": self.data_protected,
        }
