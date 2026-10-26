import React, { useState } from 'react';
import {
  History,
  Clock,
  ChevronLeft,
  Database,
  Server,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Shield,
  Activity,
  Radio,
} from 'lucide-react';
import type { RunSummary, RunDetailResponse } from '../types';
import { api } from '../api';
import { AgentBadge, SeverityBadge } from '../components/StatusBadge';

// ─── Props ────────────────────────────────────────────────────────────────────

interface HistoryViewProps {
  runs: RunSummary[];
  onLoadRun: (runId: string) => Promise<void>;
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        background: '#121929',
        border: '1px solid #1c2638',
        borderRadius: 6,
        padding: '10px 14px',
      }}
    >
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? '#f8fafc' }}>{value}</div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const ok = status === 'completed';
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: ok ? '#10b981' : '#ef4444',
        background: ok ? '#0b261d' : '#2d1216',
        border: `1px solid ${ok ? '#065f46' : '#7f1d1d'}`,
        padding: '2px 7px',
        borderRadius: 4,
      }}
    >
      {status}
    </span>
  );
}

// ─── Run Detail Full Page ─────────────────────────────────────────────────────

function RunDetailPage({
  detail,
  onBack,
  onLoadRun,
}: {
  detail: RunDetailResponse;
  onBack: () => void;
  onLoadRun: (runId: string) => Promise<void>;
}) {
  const m = detail.metrics;
  const startedAt = detail.started_at || detail.run?.started_at || '';
  const completedAt = detail.completed_at || detail.run?.completed_at || '';
  const status = detail.status || detail.run?.status || 'completed';
  const events = detail.events ?? [];
  const nodes = detail.nodes ?? [];

  const detRate = m ? Math.round(m.detection_rate * 100) : 0;

  const defensiveActions = events.filter((e) => e.agent === 'Blue Team');
  const redActions = events.filter((e) => e.agent === 'Red Team');
  const honeypotEvents = events.filter(
    (e) => (e.node_id || e.node_key || '').includes('honeypot')
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Breadcrumb header */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: '#121929',
              border: '1px solid #1c2638',
              color: '#94a3b8',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ChevronLeft size={13} /> Back to History
          </button>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              Run Details
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569', marginTop: 1 }}>
              {detail.run_id}
            </div>
          </div>
          <StatusChip status={status} />
        </div>
        <button
          onClick={() => onLoadRun(detail.run_id)}
          style={{
            background: '#10b98120',
            border: '1px solid #10b98150',
            color: '#10b981',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Activity size={13} /> Load into Dashboard
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Timestamps */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
            <Calendar size={13} color="#64748b" />
            <span style={{ color: '#475569' }}>Started:</span>
            <span style={{ fontFamily: 'monospace' }}>
              {startedAt ? new Date(startedAt).toLocaleString() : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
            <CheckCircle size={13} color="#10b981" />
            <span style={{ color: '#475569' }}>Completed:</span>
            <span style={{ fontFamily: 'monospace' }}>
              {completedAt ? new Date(completedAt).toLocaleString() : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
            <Activity size={13} color="#06b6d4" />
            <span style={{ color: '#475569' }}>Events:</span>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>{events.length}</span>
          </div>
        </div>

        {/* Metrics grid */}
        {m && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Final Metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <MetricTile
                label="Detection Rate"
                value={`${detRate}%`}
                color={detRate >= 70 ? '#10b981' : detRate >= 40 ? '#f59e0b' : '#ef4444'}
              />
              <MetricTile label="Threats Detected" value={`${m.threats_detected} / ${m.threats_generated ?? '?'}`} color="#06b6d4" />
              <MetricTile label="Attacks Blocked" value={m.attacks_blocked} color="#f59e0b" />
              <MetricTile
                label="Compromised Assets"
                value={m.compromised_assets ?? 0}
                color={(m.compromised_assets ?? 0) > 0 ? '#ef4444' : '#10b981'}
              />
            </div>
          </div>
        )}

        {/* Node states */}
        {nodes.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Affected Network Nodes ({nodes.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {nodes.map((n) => {
                const st = n.metadata?.status ?? 'clean';
                const color =
                  st === 'compromised' ? '#ef4444' :
                  st === 'isolated' ? '#06b6d4' :
                  st === 'honeypot_hit' ? '#eab308' :
                  st === 'suspicious' ? '#f97316' :
                  '#10b981';
                return (
                  <div
                    key={n.node_key}
                    style={{
                      background: '#121929',
                      border: `1px solid ${color}30`,
                      borderRadius: 6,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>{n.label}</div>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color,
                          background: `${color}18`,
                          padding: '1px 6px',
                          borderRadius: 3,
                        }}
                      >
                        {st.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{n.node_key}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, textTransform: 'uppercase' }}>{n.node_type}</div>
                    {n.metadata?.risk_score !== undefined && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ height: 3, background: '#141b2a', borderRadius: 2, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.round(n.metadata.risk_score * 100)}%`,
                              background: color,
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Shield size={13} color="#06b6d4" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Defensive Actions ({defensiveActions.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
              {defensiveActions.length === 0 ? (
                <div style={{ fontSize: 11, color: '#475569' }}>No defensive events recorded.</div>
              ) : (
                defensiveActions.map((e, i) => (
                  <div key={e.id || i} style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <CheckCircle size={10} color="#10b981" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', color: '#67e8f9' }}>{e.action}</span>
                    <span style={{ color: '#475569' }}>on</span>
                    <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{e.node_id || e.node_key}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Activity size={13} color="#ef4444" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Attack Vectors ({redActions.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
              {redActions.length === 0 ? (
                <div style={{ fontSize: 11, color: '#475569' }}>No attack events recorded.</div>
              ) : (
                redActions.map((e, i) => (
                  <div key={e.id || i} style={{ fontSize: 11, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertTriangle size={10} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', color: '#f87171' }}>{e.action}</span>
                    <span style={{ color: '#475569' }}>→</span>
                    <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{e.node_id || e.node_key}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Radio size={13} color="#eab308" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Honeypot Events ({honeypotEvents.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
              {honeypotEvents.length === 0 ? (
                <div style={{ fontSize: 11, color: '#475569' }}>No honeypot interactions recorded.</div>
              ) : (
                honeypotEvents.map((e, i) => (
                  <div key={e.id || i} style={{ fontSize: 11, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Radio size={10} color="#eab308" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', color: '#fde047' }}>{e.action}</span>
                    <AgentBadge agent={e.agent} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Full event sequence */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Event Sequence ({events.length} events)
          </div>
          <div
            style={{
              background: '#0d121f',
              border: '1px solid #1c2638',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {events.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>
                No events associated with this run.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#121929', borderBottom: '1px solid #1c2638' }}>
                      {['#', 'Time', 'Agent', 'Action', 'Node', 'Severity', 'Outcome', 'Message'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '9px 14px',
                            color: '#475569',
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, idx) => {
                      const ts = new Date(e.timestamp || e.occurred_at || '');
                      const timeStr = isNaN(ts.getTime()) ? '—' : ts.toLocaleTimeString();
                      return (
                        <tr
                          key={e.id || idx}
                          style={{
                            borderBottom: '1px solid #141b2a',
                            background: idx % 2 === 0 ? 'transparent' : '#0b0f1a',
                          }}
                        >
                          <td style={{ padding: '8px 14px', color: '#475569', fontSize: 11 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '8px 14px', color: '#64748b', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {timeStr}
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <AgentBadge agent={e.agent} />
                          </td>
                          <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#f8fafc', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {e.action}
                          </td>
                          <td style={{ padding: '8px 14px', color: '#38bdf8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {e.node_id || e.node_key || '—'}
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <SeverityBadge severity={e.severity} />
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            {e.success ? (
                              <span style={{ color: '#10b981', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <CheckCircle size={11} /> OK
                              </span>
                            ) : (
                              <span style={{ color: '#06b6d4', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <AlertTriangle size={11} /> Blocked
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 14px', color: '#94a3b8', maxWidth: 320 }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.message}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main HistoryView Component ───────────────────────────────────────────────

export const HistoryView: React.FC<HistoryViewProps> = ({ runs, onLoadRun, loading }) => {
  const [selectedRunDetail, setSelectedRunDetail] = useState<RunDetailResponse | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleInspectRun = async (runId: string) => {
    setFetchingDetail(true);
    setFetchError(null);
    try {
      const data = await api.getRun(runId);
      setSelectedRunDetail(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load run details.');
    } finally {
      setFetchingDetail(false);
    }
  };

  // Show run detail page
  if (selectedRunDetail) {
    return (
      <div style={{ padding: 24, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <RunDetailPage
          detail={selectedRunDetail}
          onBack={() => setSelectedRunDetail(null)}
          onLoadRun={onLoadRun}
        />
      </div>
    );
  }

  // Show run list
  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <History size={16} color="#a78bfa" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Historical Simulation Runs</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: '#121929',
              color: '#94a3b8',
              border: '1px solid #1c2638',
            }}
          >
            {runs.length} run{runs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Click <strong style={{ color: '#94a3b8' }}>Inspect</strong> to see a run's full event sequence and node states.
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div
          style={{
            background: '#2d1216',
            border: '1px solid #7f1d1d',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 12,
            color: '#f87171',
            flexShrink: 0,
          }}
        >
          {fetchError}
        </div>
      )}

      {/* Runs Table */}
      <div
        style={{
          flex: 1,
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          overflowY: 'auto',
        }}
      >
        {runs.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              gap: 14,
            }}
          >
            <Clock size={40} color="#1c2638" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>No simulation runs recorded yet</div>
              <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                Run a simulation in the Simulation Lab to record telemetry.
              </div>
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#121929', borderBottom: '1px solid #1c2638' }}>
                {['Run ID', 'Timestamp', 'Seed', 'Events', 'Detections', 'Blocked', 'Det. Rate', 'Status', ''].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '11px 16px',
                        color: '#475569',
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {runs.map((r, idx) => {
                const dateStr = new Date(r.started_at).toLocaleString();
                const ratePct = Math.round(r.detection_rate * 100);
                return (
                  <tr
                    key={r.run_id || idx}
                    style={{
                      borderBottom: '1px solid #141b2a',
                      background: idx % 2 === 0 ? 'transparent' : '#0b0f1a',
                    }}
                  >
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                      {r.run_id.slice(0, 8)}…
                    </td>
                    <td style={{ padding: '11px 16px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: '11px 16px', color: '#38bdf8', fontFamily: 'monospace', fontSize: 11 }}>
                      {r.seed ?? '—'}
                    </td>
                    <td style={{ padding: '11px 16px', color: '#f8fafc', fontWeight: 600 }}>
                      {r.total_events}
                    </td>
                    <td style={{ padding: '11px 16px', color: '#06b6d4', fontWeight: 600 }}>
                      {r.threats_detected}
                    </td>
                    <td style={{ padding: '11px 16px', color: '#10b981', fontWeight: 600 }}>
                      {r.attacks_blocked}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: ratePct >= 70 ? '#0b261d' : '#2e240a',
                          color: ratePct >= 70 ? '#34d399' : '#fbbf24',
                          border: `1px solid ${ratePct >= 70 ? '#065f46' : '#854d0e'}`,
                        }}
                      >
                        {ratePct}%
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <StatusChip status={r.status} />
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => handleInspectRun(r.run_id)}
                          disabled={fetchingDetail}
                          style={{
                            background: '#121929',
                            border: '1px solid #2a3852',
                            color: fetchingDetail ? '#475569' : '#94a3b8',
                            borderRadius: 4,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: fetchingDetail ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {fetchingDetail ? (
                            <>
                              <Activity size={10} style={{ animation: 'spin 1s linear infinite' }} />
                              Loading…
                            </>
                          ) : (
                            <>
                              <Database size={10} />
                              Inspect
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => onLoadRun(r.run_id)}
                          disabled={loading}
                          style={{
                            background: '#10b98115',
                            border: '1px solid #10b98140',
                            color: '#10b981',
                            borderRadius: 4,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Server size={10} />
                          Load
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
