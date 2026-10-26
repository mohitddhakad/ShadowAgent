import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Server,
  Database,
  User,
  ShieldAlert,
  Radio,
  Activity,
  ZoomIn,
  Maximize2,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  X,
  Info,
} from 'lucide-react';
import type { NetworkNode, NetworkTopology, SimulationResult, SimulationEvent } from '../types';
import { NodeStatusBadge, SeverityBadge, AgentBadge } from '../components/StatusBadge';

// ── Type helpers ──────────────────────────────────────────────────────────────

interface NetworkViewProps {
  topology: NetworkTopology | null;
  latestResult: SimulationResult | null;
  loading: boolean;
}

type NodeStatus = 'clean' | 'suspicious' | 'compromised' | 'isolated' | 'honeypot_hit';

// ── Design constants ──────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  firewall: { bg: '#231508', border: '#f97316', text: '#fdba74', icon: '#f97316' },
  user: { bg: '#0b192e', border: '#3b82f6', text: '#93c5fd', icon: '#3b82f6' },
  server: { bg: '#082115', border: '#22c55e', text: '#86efac', icon: '#22c55e' },
  database: { bg: '#1c102e', border: '#a855f7', text: '#d8b4fe', icon: '#a855f7' },
  honeypot: { bg: '#291e05', border: '#eab308', text: '#fde047', icon: '#eab308' },
  siem: { bg: '#082329', border: '#06b6d4', text: '#67e8f9', icon: '#06b6d4' },
};

const STATUS_STYLE: Record<string, { border: string; shadow: string; dot: string; label: string }> = {
  clean: { border: '', shadow: 'none', dot: '#10b981', label: 'Clean' },
  suspicious: { border: '#f97316', shadow: '0 0 8px rgba(249,115,22,0.25)', dot: '#f97316', label: 'Suspicious' },
  compromised: { border: '#ef4444', shadow: '0 0 14px rgba(239,68,68,0.4)', dot: '#ef4444', label: 'Compromised' },
  isolated: { border: '#06b6d4', shadow: '0 0 10px rgba(6,182,212,0.3)', dot: '#06b6d4', label: 'Isolated' },
  honeypot_hit: { border: '#eab308', shadow: '0 0 12px rgba(234,179,8,0.35)', dot: '#eab308', label: 'Honeypot Hit' },
};

// ── Node icon helper ──────────────────────────────────────────────────────────

function NodeIcon({ type, color, size = 16 }: { type: string; color: string; size?: number }) {
  switch (type.toLowerCase()) {
    case 'database': return <Database size={size} color={color} />;
    case 'user': return <User size={size} color={color} />;
    case 'honeypot': return <Radio size={size} color={color} />;
    case 'firewall': return <ShieldAlert size={size} color={color} />;
    case 'siem': return <Activity size={size} color={color} />;
    default: return <Server size={size} color={color} />;
  }
}

// ── Custom React Flow Node Component ─────────────────────────────────────────

interface CustomNodeData {
  nodeType: string;
  label: string;
  nodeId: string;
  status: NodeStatus;
  riskScore: number;
  eventCount: number;
  isHoneypot: boolean;
  isSelected: boolean;
}

function CustomNetworkNode({ data }: NodeProps) {
  const d = data as unknown as CustomNodeData;
  const typeStyle = TYPE_COLORS[d.nodeType] ?? { bg: '#121929', border: '#475569', text: '#f8fafc', icon: '#94a3b8' };
  const statusSt = STATUS_STYLE[d.status] ?? STATUS_STYLE.clean;
  const activeBorder = statusSt.border || typeStyle.border;
  const riskPct = Math.round(d.riskScore * 100);

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        style={{
          background: typeStyle.bg,
          border: `2px solid ${activeBorder}`,
          borderStyle: d.isHoneypot ? 'dashed' : 'solid',
          borderRadius: 8,
          padding: '8px 12px',
          minWidth: 136,
          maxWidth: 160,
          boxShadow: d.isSelected
            ? `0 0 0 2px #f8fafc40, ${statusSt.shadow}`
            : statusSt.shadow,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <NodeIcon type={d.nodeType} color={typeStyle.icon} size={14} />
          <span style={{ fontSize: 12, fontWeight: 700, color: typeStyle.text, lineHeight: 1.2 }}>
            {d.label}
          </span>
          {/* Status dot */}
          <div
            style={{
              marginLeft: 'auto',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusSt.dot,
              flexShrink: 0,
              boxShadow: `0 0 4px ${statusSt.dot}88`,
            }}
          />
        </div>

        {/* Type + honeypot badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
              background: '#141b2a',
              padding: '1px 5px',
              borderRadius: 3,
              border: '1px solid #1c2638',
            }}
          >
            {d.nodeType}
          </span>
          {d.isHoneypot && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#eab308',
                background: '#1a1500',
                padding: '1px 5px',
                borderRadius: 3,
                border: '1px solid #eab30840',
              }}
            >
              DECOY
            </span>
          )}
          {d.eventCount > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 9,
                fontWeight: 700,
                color: '#ef4444',
                background: '#2a0f0f',
                padding: '1px 5px',
                borderRadius: 10,
                border: '1px solid #ef444440',
              }}
            >
              {d.eventCount}
            </span>
          )}
        </div>

        {/* Risk score bar */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9,
              color: '#475569',
              marginBottom: 3,
            }}
          >
            <span>Risk</span>
            <span style={{ color: riskPct > 60 ? '#ef4444' : riskPct > 35 ? '#f59e0b' : '#10b981' }}>
              {riskPct}%
            </span>
          </div>
          <div style={{ height: 3, background: '#1c2638', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${riskPct}%`,
                background: riskPct > 60 ? '#ef4444' : riskPct > 35 ? '#f59e0b' : '#10b981',
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes = { customNetwork: CustomNetworkNode };

// ── Canvas Controls (must be inside ReactFlow provider) ───────────────────────

function FlowControls({
  filterStatus,
  setFilterStatus,
  totalNodes,
}: {
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  totalNodes: number;
}) {
  const { fitView, setViewport } = useReactFlow();

  return (
    <Panel position="top-left">
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        {/* Fit + Reset */}
        <button
          title="Fit view to all nodes"
          onClick={() => fitView({ padding: 0.12, duration: 400 })}
          style={btnStyle}
        >
          <Maximize2 size={13} />
          <span>Fit</span>
        </button>
        <button
          title="Reset zoom to 1:1"
          onClick={() => setViewport({ x: 80, y: 60, zoom: 1 }, { duration: 300 })}
          style={btnStyle}
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>

        <div style={{ width: 1, height: 16, background: '#1c2638' }} />

        {/* Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
          <span style={{ color: '#64748b' }}>Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              background: '#121929',
              border: '1px solid #2a3852',
              color: '#f8fafc',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">All Assets ({totalNodes})</option>
            <option value="clean">Clean</option>
            <option value="suspicious">Suspicious</option>
            <option value="compromised">Compromised</option>
            <option value="isolated">Isolated</option>
            <option value="honeypot_hit">Honeypot Hit</option>
          </select>
        </div>

        <div style={{ width: 1, height: 16, background: '#1c2638' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b' }}>
          <Info size={12} color="#06b6d4" />
          <span>Click node to inspect</span>
        </div>
      </div>
    </Panel>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: '#121929',
  border: '1px solid #2a3852',
  color: '#94a3b8',
  borderRadius: 5,
  padding: '4px 9px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

// ── Side Panel ────────────────────────────────────────────────────────────────

function NodeDetailPanel({
  node,
  status,
  events,
  onClose,
}: {
  node: NetworkNode;
  status: NodeStatus;
  events: SimulationEvent[];
  onClose: () => void;
}) {
  const typeStyle = TYPE_COLORS[node.type] ?? { bg: '#121929', border: '#475569', text: '#f8fafc', icon: '#94a3b8' };
  const nodeEvents = events.filter((e) => e.node_id === node.id || e.node_key === node.id);
  const riskPct = Math.round((node.risk_score ?? 0.3) * 100);

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        background: '#0a0f1c',
        borderLeft: '1px solid #1c2638',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #1c2638',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0d121f',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NodeIcon type={node.type} color={typeStyle.icon} size={16} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{node.label}</div>
            <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{node.id}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close panel"
          style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, lineHeight: 1 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Panel Body */}
      <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Status + Type */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>Security State</div>
            <NodeStatusBadge status={status} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>Asset Type</div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: typeStyle.text,
                textTransform: 'uppercase',
                background: typeStyle.bg,
                padding: '3px 8px',
                borderRadius: 4,
                border: `1px solid ${typeStyle.border}40`,
              }}
            >
              {node.type}
            </span>
          </div>
        </div>

        {/* Risk Score */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: '#94a3b8' }}>Base Vulnerability</span>
            <span style={{ fontWeight: 700, color: riskPct > 60 ? '#ef4444' : riskPct > 35 ? '#f59e0b' : '#10b981' }}>
              {riskPct}%
            </span>
          </div>
          <div style={{ height: 5, background: '#141b2a', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${riskPct}%`,
                background: riskPct > 60 ? '#ef4444' : riskPct > 35 ? '#f59e0b' : '#10b981',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Description */}
        {node.description && (
          <div
            style={{
              fontSize: 11,
              color: '#94a3b8',
              background: '#121929',
              padding: 10,
              borderRadius: 6,
              border: '1px solid #1c2638',
              lineHeight: 1.5,
            }}
          >
            {node.description}
          </div>
        )}

        {/* Events */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#f8fafc',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Targeted Activity</span>
            <span
              style={{
                background: nodeEvents.length > 0 ? '#2a0f0f' : '#121929',
                color: nodeEvents.length > 0 ? '#ef4444' : '#475569',
                padding: '1px 7px',
                borderRadius: 10,
                fontSize: 10,
                border: `1px solid ${nodeEvents.length > 0 ? '#ef444430' : '#1c2638'}`,
              }}
            >
              {nodeEvents.length}
            </span>
          </div>

          {nodeEvents.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                color: '#475569',
                textAlign: 'center',
                padding: '20px 0',
                borderRadius: 6,
                border: '1px dashed #1c2638',
                background: '#0a0f1c',
              }}
            >
              No activity recorded on this node.
              <br />
              <span style={{ fontSize: 10, marginTop: 4, display: 'block' }}>Run a simulation to see events.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nodeEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    background: '#121929',
                    border: '1px solid #1c2638',
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <AgentBadge agent={evt.agent} />
                    <SeverityBadge severity={evt.severity} />
                  </div>
                  <div style={{ color: '#f8fafc', fontWeight: 600, margin: '4px 0', fontSize: 11 }}>
                    {evt.action.replace(/_/g, ' ')}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.4 }}>{evt.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Legend Panel (shown when no node is selected) ─────────────────────────────

function LegendPanel({ topology, nodeStatuses }: { topology: NetworkTopology; nodeStatuses: Record<string, string> }) {
  const statusCounts: Record<string, number> = {};
  topology.nodes.forEach((n) => {
    const st = nodeStatuses[n.id] ?? 'clean';
    statusCounts[st] = (statusCounts[st] ?? 0) + 1;
  });

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        background: '#0a0f1c',
        borderLeft: '1px solid #1c2638',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #1c2638',
          background: '#0d121f',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Network Map
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
          {topology.nodes.length} assets · {topology.edges.length} connections
        </div>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Node type legend */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Asset Types
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(TYPE_COLORS).map(([type, style]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 16,
                    background: style.bg,
                    border: `1.5px solid ${style.border}`,
                    borderRadius: 3,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
                  {type === 'siem' ? 'SIEM Monitor' : type === 'user' ? 'Workstation' : type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status legend */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Security Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {Object.entries(STATUS_STYLE).map(([status, st]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: st.dot,
                      boxShadow: `0 0 4px ${st.dot}88`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{st.label}</span>
                </div>
                {(statusCounts[status] ?? 0) > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: st.dot,
                      background: `${st.dot}18`,
                      padding: '1px 6px',
                      borderRadius: 8,
                    }}
                  >
                    {statusCounts[status]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connection guide */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Connections
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 2, width: 32, background: '#2a3852', borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Network segment link</span>
          </div>
        </div>

        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1c2638',
            borderRadius: 6,
            padding: 10,
            fontSize: 10,
            color: '#64748b',
            lineHeight: 1.5,
          }}
        >
          <ZoomIn size={11} style={{ display: 'inline', marginRight: 4 }} />
          Scroll to zoom · Drag to pan · Click a node to inspect its security state and events.
        </div>
      </div>
    </div>
  );
}

// ── Loading overlay ───────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(7, 10, 18, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #1c2638',
            borderTop: '3px solid #06b6d4',
            borderRadius: '50%',
            margin: '0 auto 12px',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ fontSize: 13, color: '#94a3b8' }}>Running simulation…</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Updating network state</div>
      </div>
    </div>
  );
}

// ── Empty / Error state ───────────────────────────────────────────────────────

function EmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        background: '#070a12',
        color: '#475569',
      }}
    >
      <AlertTriangle size={36} color="#1c2638" />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Network Unavailable</div>
        <div style={{ fontSize: 12 }}>Could not load topology from the backend.</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>Ensure the FastAPI server is running on port 8000.</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 4,
            background: '#0d121f',
            border: '1px solid #2a3852',
            color: '#94a3b8',
            borderRadius: 6,
            padding: '7px 18px',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RotateCcw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}

// ── Simulation status bar ─────────────────────────────────────────────────────

function SimStatusBar({ result }: { result: SimulationResult }) {
  const m = result.metrics;
  const detRate = Math.round((m.detection_rate ?? 0) * 100);
  const containment = m.successful_containment ?? m.attacks_blocked ?? 0;
  const compromised = m.compromised_assets ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '6px 16px',
        background: '#0d121f',
        borderBottom: '1px solid #1c2638',
        fontSize: 11,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b' }}>
        <CheckCircle size={11} color="#10b981" />
        <span style={{ color: '#94a3b8' }}>Last Run:</span>
        <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>{result.run_id.slice(0, 8)}…</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#64748b' }}>Detection</span>
        <span style={{ color: detRate >= 70 ? '#10b981' : detRate >= 40 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
          {detRate}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#64748b' }}>Contained</span>
        <span style={{ color: '#06b6d4', fontWeight: 700 }}>{containment}</span>
      </div>
      {compromised > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={10} color="#ef4444" />
          <span style={{ color: '#64748b' }}>Compromised</span>
          <span style={{ color: '#ef4444', fontWeight: 700 }}>{compromised}</span>
        </div>
      )}
      <div style={{ marginLeft: 'auto', color: '#475569' }}>
        {result.events.length} events recorded in this run
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export const NetworkView: React.FC<NetworkViewProps> = ({ topology, latestResult, loading }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Simulation statuses — ONLY from latestResult, never fabricated
  const nodeStatuses: Record<string, string> = useMemo(
    () => latestResult?.node_statuses ?? {},
    [latestResult]
  );

  // Event count per node
  const eventCountByNode = useMemo(() => {
    const counts: Record<string, number> = {};
    latestResult?.events.forEach((e) => {
      const nid = e.node_id || e.node_key || '';
      if (nid) counts[nid] = (counts[nid] || 0) + 1;
    });
    return counts;
  }, [latestResult]);

  // Selected node's raw data
  const selectedNode: NetworkNode | null = useMemo(
    () => (selectedNodeId ? (topology?.nodes.find((n) => n.id === selectedNodeId) ?? null) : null),
    [selectedNodeId, topology]
  );

  // Build React Flow nodes
  const rfNodes: Node[] = useMemo(() => {
    if (!topology) return [];

    return topology.nodes
      .filter((n) => {
        if (filterStatus === 'all') return true;
        const st = nodeStatuses[n.id] ?? 'clean';
        return st === filterStatus;
      })
      .map((n) => {
        const status = (nodeStatuses[n.id] ?? 'clean') as NodeStatus;
        const customData: CustomNodeData = {
          nodeType: n.type,
          label: n.label,
          nodeId: n.id,
          status,
          riskScore: n.risk_score ?? 0.3,
          eventCount: eventCountByNode[n.id] ?? 0,
          isHoneypot: n.type === 'honeypot',
          isSelected: n.id === selectedNodeId,
        };
        return {
          id: n.id,
          type: 'customNetwork',
          position: { x: n.x * 1.2, y: n.y * 1.15 },
          data: customData as unknown as Record<string, unknown>,
          selectable: true,
        };
      });
  }, [topology, nodeStatuses, filterStatus, selectedNodeId, eventCountByNode]);

  // Build React Flow edges
  const rfEdges: Edge[] = useMemo(() => {
    if (!topology) return [];
    return topology.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      style: { stroke: '#2a3852', strokeWidth: 1.5 },
      animated: loading,
    }));
  }, [topology, loading]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  if (!topology && !loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#070a12' }}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#070a12', overflow: 'hidden' }}>
      {/* Simulation result status bar */}
      {latestResult && <SimStatusBar result={latestResult} />}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* React Flow Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && <LoadingOverlay />}

          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#070a12' }}
          >
            <Background color="#162032" gap={24} size={1} />
            <Controls
              style={{
                background: '#0d121f',
                border: '1px solid #1c2638',
                borderRadius: 6,
              }}
            />
            <FlowControls
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              totalNodes={topology?.nodes.length ?? 0}
            />
          </ReactFlow>
        </div>

        {/* Right Side Panel */}
        {selectedNode ? (
          <NodeDetailPanel
            node={selectedNode}
            status={(nodeStatuses[selectedNode.id] ?? 'clean') as NodeStatus}
            events={latestResult?.events ?? []}
            onClose={() => setSelectedNodeId(null)}
          />
        ) : (
          topology && (
            <LegendPanel topology={topology} nodeStatuses={nodeStatuses} />
          )
        )}
      </div>
    </div>
  );
};
