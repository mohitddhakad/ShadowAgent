import React from 'react';
import { X, Server, Database, User, ShieldAlert, Radio, Activity } from 'lucide-react';
import type { NetworkNode, SimulationEvent } from '../types';
import { NodeStatusBadge, SeverityBadge, AgentBadge } from './StatusBadge';

interface NodeDetailModalProps {
  node: NetworkNode | null;
  onClose: () => void;
  events?: SimulationEvent[];
  status?: string;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  onClose,
  events = [],
  status = 'clean',
}) => {
  if (!node) return null;

  const nodeEvents = events.filter((e) => e.node_id === node.id || e.node_key === node.id);

  const getNodeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'database':
        return <Database size={20} color="#a855f7" />;
      case 'user':
        return <User size={20} color="#3b82f6" />;
      case 'honeypot':
        return <Radio size={20} color="#eab308" />;
      case 'firewall':
        return <ShieldAlert size={20} color="#f97316" />;
      case 'siem':
        return <Activity size={20} color="#06b6d4" />;
      default:
        return <Server size={20} color="#22c55e" />;
    }
  };

  const riskPct = Math.round((node.risk_score ?? 0.3) * 100);

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 360,
        maxHeight: 'calc(100% - 32px)',
        background: '#0d121f',
        border: '1px solid #2a3852',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #1c2638',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {getNodeIcon(node.type)}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{node.label}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{node.id}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status & Type */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Security State</div>
            <NodeStatusBadge status={status} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Asset Type</div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                background: '#141b2a',
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid #1c2638',
              }}
            >
              {node.type}
            </span>
          </div>
        </div>

        {/* Risk Score */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: '#94a3b8' }}>Base Asset Vulnerability</span>
            <span style={{ fontWeight: 700, color: riskPct > 50 ? '#ef4444' : '#f59e0b' }}>
              {riskPct}%
            </span>
          </div>
          <div style={{ height: 6, background: '#141b2a', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${riskPct}%`,
                background: riskPct > 50 ? '#ef4444' : '#f59e0b',
                borderRadius: 3,
              }}
            />
          </div>
        </div>

        {/* Description */}
        {node.description && (
          <div style={{ fontSize: 12, color: '#94a3b8', background: '#121929', padding: 10, borderRadius: 6, border: '1px solid #1c2638' }}>
            {node.description}
          </div>
        )}

        {/* Targeted Events in Current Run */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Targeted Activity ({nodeEvents.length})</span>
          </div>
          {nodeEvents.length === 0 ? (
            <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
              No suspicious or defensive events recorded on this node in the current simulation.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nodeEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    background: '#121929',
                    border: '1px solid #1c2638',
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <AgentBadge agent={evt.agent} />
                    <SeverityBadge severity={evt.severity} />
                  </div>
                  <div style={{ color: '#f8fafc', fontWeight: 500, margin: '4px 0' }}>
                    {evt.action.replace('_', ' ')}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>{evt.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
