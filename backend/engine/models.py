"""
Pydantic models shared across the ShadowAgent engine and API layer.
All models are pure data — no I/O, no side effects.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enumerations ──────────────────────────────────────────────────────────────

class NodeType(str, Enum):
    USER       = "user"
    SERVER     = "server"
    DATABASE   = "database"
    HONEYPOT   = "honeypot"
    FIREWALL   = "firewall"
    SIEM       = "siem"


class NodeStatus(str, Enum):
    CLEAN        = "clean"
    SUSPICIOUS   = "suspicious"
    COMPROMISED  = "compromised"
    ISOLATED     = "isolated"
    HONEYPOT_HIT = "honeypot_hit"


class Severity(str, Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


class AgentTeam(str, Enum):
    RED  = "Red Team"
    BLUE = "Blue Team"


# ── Network models ────────────────────────────────────────────────────────────

class NetworkNode(BaseModel):
    id:          str
    label:       str
    type:        str
    x:           float
    y:           float
    description: str        = ""
    status:      NodeStatus = NodeStatus.CLEAN
    risk_score:  float      = Field(default=0.0, ge=0.0, le=1.0, description="0 = no risk, 1 = fully compromised")


class NetworkEdge(BaseModel):
    id:     str
    source: str
    target: str


class NetworkTopology(BaseModel):
    nodes: list[NetworkNode]
    edges: list[NetworkEdge]


# ── Simulation models ─────────────────────────────────────────────────────────

class SimulationEvent(BaseModel):
    id:        str
    timestamp: str
    agent:     str   # AgentTeam value
    action:    str
    node_id:   str
    severity:  str   # Severity value
    message:   str
    success:   bool
    phase:     int   = Field(default=1, description="Simulation phase number (1-4)")


class SimulationMetrics(BaseModel):
    total_events:          int
    threats_generated:     int   = Field(description="Total red-team attack events")
    threats_detected:      int   = Field(description="Red-team events that triggered a blue response")
    detection_rate:        float = Field(description="threats_detected / threats_generated, in [0,1]")
    false_positives:       int   = Field(description="Blue-team alerts with no corresponding red event in same phase-node")
    successful_containment:int   = Field(description="Red-team attacks that were blocked (success=False for red)")
    compromised_assets:    int   = Field(description="Distinct nodes in COMPROMISED or ISOLATED status")
    data_protected:        bool
    attacks_blocked:       int
    simulation_duration_ms:int   = Field(description="Simulated timeline length in ms (last event offset)")
    response_time_ms:      int   = Field(description="Deterministic value based on seed, not wall-clock time")


class SimulationResult(BaseModel):
    run_id:       str
    status:       str
    started_at:   str
    completed_at: str
    seed:         int
    config:       "SimulationConfig"
    events:       list[SimulationEvent]
    metrics:      SimulationMetrics
    node_statuses: dict[str, str]   = Field(description="Final status of each node after simulation")
    persisted:    bool              = Field(default=False, description="True only if successfully saved to database")
    persistence_backend: str        = Field(default="in_memory", description="'supabase' or 'in_memory'")
    persistence_message: str        = Field(default="", description="Safe persistence status or error message")


class RunSummary(BaseModel):
    id:            Optional[str]  = None
    run_id:        str
    status:        str
    started_at:    str
    completed_at:  Optional[str]  = None
    seed:          Optional[int]  = None
    total_events:  int
    threats_detected: int
    attacks_blocked:  int
    detection_rate:   float
    compromised_assets: int       = 0
    data_protected:    bool       = True
    metrics:       dict           = Field(default_factory=dict)


class SimulationRequest(BaseModel):
    seed:                  Optional[int]  = Field(default=None, description="Random seed for reproducibility. None = random.")
    detection_sensitivity: float          = Field(default=0.8, ge=0.0, le=1.0, description="Blue Team detection probability per threat (0=blind, 1=perfect)")
    honeypot_enabled:      bool           = Field(default=True,  description="Whether the honeypot is monitored")
    aggressive_red:        bool           = Field(default=False, description="Red Team attempts more attack vectors")


class SimulationConfig(BaseModel):
    seed:                  int
    detection_sensitivity: float
    honeypot_enabled:      bool
    aggressive_red:        bool


# ── Comparison & Analytics Models ─────────────────────────────────────────────

class CompareRequest(BaseModel):
    seed: Optional[int] = Field(default=42, description="Random seed used for both configurations to guarantee fairness")
    config_a: SimulationRequest = Field(
        default_factory=lambda: SimulationRequest(detection_sensitivity=0.4, honeypot_enabled=False, aggressive_red=False),
        description="Configuration A (e.g. Baseline Defense)",
    )
    config_b: SimulationRequest = Field(
        default_factory=lambda: SimulationRequest(detection_sensitivity=0.85, honeypot_enabled=True, aggressive_red=False),
        description="Configuration B (e.g. Enhanced Defense)",
    )


class ComparisonMetricDiff(BaseModel):
    detection_rate_delta:       float = Field(description="Config B detection rate - Config A detection rate")
    containment_success_delta:  int   = Field(description="Config B containment - Config A containment")
    compromised_assets_delta:   int   = Field(description="Config B compromised - Config A compromised")
    false_positives_delta:      int   = Field(description="Config B false positives - Config A false positives")
    events_generated_delta:     int   = Field(description="Config B total events - Config A total events")
    runtime_ms_delta:           int   = Field(description="Config B duration ms - Config A duration ms")


class ComparisonResult(BaseModel):
    seed:               int
    run_a:              SimulationResult
    run_b:              SimulationResult
    diff:               ComparisonMetricDiff
    analysis:           str
    metric_definitions: dict[str, str]
    limitations:        list[str]


class AnalyticsSummary(BaseModel):
    total_runs:                     int
    total_threats_generated:        int
    total_threats_detected:         int
    overall_detection_rate:         float
    total_attacks_blocked:          int
    total_containment_success:      int
    overall_containment_rate:       float
    total_false_positives:          int
    avg_false_positives_per_run:    float
    total_compromised_assets:       int
    avg_compromised_assets_per_run: float
    avg_duration_ms:                float
    avg_response_time_ms:           float
    severity_distribution:          dict[str, int]
    agent_distribution:             dict[str, int]
    run_trends:                     list[dict]
    has_data:                       bool


class RLTrainRequest(BaseModel):
    total_timesteps: int = Field(default=5000, ge=1000, le=50000, description="PPO training timesteps")
    seed:            int = Field(default=42, description="Random seed for deterministic training")

