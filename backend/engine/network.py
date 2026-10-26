"""
Enterprise network topology for the ShadowAgent simulation.
All nodes and edges are fictional. No real hosts, IPs, or credentials.
"""

from __future__ import annotations

import networkx as nx

from .models import NetworkNode, NetworkEdge, NetworkTopology, NodeType, NodeStatus


# ── Node definitions ──────────────────────────────────────────────────────────

_NODES: list[dict] = [
    dict(id="firewall-1",   label="Perimeter Firewall",   type=NodeType.FIREWALL,  x=100, y=300, risk_score=0.1, description="Edge firewall — ingress/egress control"),
    dict(id="user-1",       label="Employee Workstation", type=NodeType.USER,      x=300, y=150, risk_score=0.3, description="Standard employee endpoint"),
    dict(id="user-2",       label="Admin Workstation",    type=NodeType.USER,      x=300, y=450, risk_score=0.4, description="Privileged administrator endpoint"),
    dict(id="identity-1",   label="Identity Server",      type=NodeType.SERVER,    x=550, y=150, risk_score=0.5, description="Active Directory / SSO server"),
    dict(id="app-1",        label="Application Server",   type=NodeType.SERVER,    x=550, y=300, risk_score=0.4, description="Internal business application"),
    dict(id="fileserver-1", label="File Server",          type=NodeType.SERVER,    x=550, y=450, risk_score=0.35, description="Shared network file storage"),
    dict(id="db-1",         label="Database Server",      type=NodeType.DATABASE,  x=800, y=300, risk_score=0.6, description="Primary relational database"),
    dict(id="siem-1",       label="SIEM",                 type=NodeType.SIEM,      x=800, y=100, risk_score=0.1, description="Security information & event manager"),
    dict(id="honeypot-1",   label="Decoy Server",         type=NodeType.HONEYPOT,  x=800, y=500, risk_score=0.0, description="Honeypot — any access triggers alert"),
]

# ── Edge definitions (directed: attacker traversal path) ──────────────────────

_EDGES: list[dict] = [
    dict(id="e1",  source="firewall-1",   target="user-1"),
    dict(id="e2",  source="firewall-1",   target="user-2"),
    dict(id="e3",  source="user-1",       target="identity-1"),
    dict(id="e4",  source="user-2",       target="identity-1"),
    dict(id="e5",  source="identity-1",   target="app-1"),
    dict(id="e6",  source="identity-1",   target="fileserver-1"),
    dict(id="e7",  source="app-1",        target="db-1"),
    dict(id="e8",  source="fileserver-1", target="db-1"),
    dict(id="e9",  source="app-1",        target="honeypot-1"),
    dict(id="e10", source="siem-1",       target="identity-1"),
    dict(id="e11", source="siem-1",       target="app-1"),
    dict(id="e12", source="siem-1",       target="db-1"),
]


def build_network() -> nx.DiGraph:
    """Return a directed NetworkX graph representing the fictional enterprise."""
    G = nx.DiGraph()
    for n in _NODES:
        G.add_node(
            n["id"],
            label=n["label"],
            type=n["type"].value if hasattr(n["type"], "value") else n["type"],
            x=n["x"],
            y=n["y"],
            risk_score=n["risk_score"],
            description=n["description"],
            status=NodeStatus.CLEAN.value,
        )
    for e in _EDGES:
        G.add_edge(e["source"], e["target"], id=e["id"])
    return G


def get_topology_response() -> NetworkTopology:
    """Return topology as Pydantic model (stable, no simulation state)."""
    nodes = [
        NetworkNode(
            id=n["id"],
            label=n["label"],
            type=n["type"].value if hasattr(n["type"], "value") else n["type"],
            x=n["x"],
            y=n["y"],
            description=n["description"],
            status=NodeStatus.CLEAN,
            risk_score=n["risk_score"],
        )
        for n in _NODES
    ]
    edges = [NetworkEdge(**e) for e in _EDGES]
    return NetworkTopology(nodes=nodes, edges=edges)
