"""ShadowAgent simulation engine package."""
from .simulation import SimulationEngine, SimulationConfig
from .network import build_network, get_topology_response
from .models import (
    SimulationEvent,
    SimulationMetrics,
    SimulationResult,
    NetworkNode,
    NetworkEdge,
    NetworkTopology,
    NodeStatus,
    RunSummary,
    SimulationRequest,
    CompareRequest,
    ComparisonMetricDiff,
    ComparisonResult,
    AnalyticsSummary,
    RLTrainRequest,
)

__all__ = [
    "SimulationEngine",
    "SimulationConfig",
    "build_network",
    "get_topology_response",
    "SimulationEvent",
    "SimulationMetrics",
    "SimulationResult",
    "NetworkNode",
    "NetworkEdge",
    "NetworkTopology",
    "NodeStatus",
    "RunSummary",
    "SimulationRequest",
    "CompareRequest",
    "ComparisonMetricDiff",
    "ComparisonResult",
    "AnalyticsSummary",
    "RLTrainRequest",
]
