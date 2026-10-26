import React, { useState, useRef } from 'react';
import {
  Play,
  Sliders,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Clock,
  Database,
  Server,
  Radio,
  Copy,
  ExternalLink,
} from 'lucide-react';
import type { SimulationResult, SimulationRequest, ViewTab } from '../types';
import { AgentBadge, SeverityBadge } from '../components/StatusBadge';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SimulationLabViewProps {
  latestResult: SimulationResult | null;
  onRunSimulation: (req: SimulationRequest) => Promise<void>;
  loading: boolean;
  onNavigate: (tab: ViewTab) => void;
  error?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(startedAt: string, completedAt: string): string {
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function StatBox({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: '#121929',
        border: '1px solid #1c2638',
        borderRadius: 6,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── Running Indicator ────────────────────────────────────────────────────────

function RunningIndicator() {
  return (
    <div
      style={{
        background: '#0d121f',
        border: '1px solid #1c2638',
        borderRadius: 8,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flex: 1,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '3px solid #1c2638',
          borderTop: '3px solid #06b6d4',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>
          Simulation in progress
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Red Team agents executing attack sequence · Blue Team monitoring…
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginTop: 4,
          fontSize: 11,
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }} />
          Red Team active
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', display: 'inline-block', animation: 'pulse 1.4s ease-in-out infinite' }} />
          Blue Team responding
        </div>
      </div>
    </div>
  );
}

// ─── Persistence Badge ────────────────────────────────────────────────────────

function PersistenceBadge({ result }: { result: SimulationResult }) {
  if (result.persisted === undefined) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 6,
        background: result.persisted ? '#0b261d' : '#2e1a08',
        border: `1px solid ${result.persisted ? '#065f46' : '#854d0e'}`,
        fontSize: 11,
        color: result.persisted ? '#34d399' : '#fbbf24',
      }}
    >
      {result.persisted ? (
        <Database size={12} />
      ) : (
        <Server size={12} />
      )}
      <span>
        {result.persisted
          ? `Persisted to ${result.persistence_backend === 'supabase' ? 'Supabase database' : 'in-memory cache'}`
          : result.persistence_message || 'Persistence failed'}
      </span>
    </div>
  );
}

// ─── Run Summary Panel ────────────────────────────────────────────────────────

function RunSummaryPanel({
  result,
  onNavigate,
}: {
  result: SimulationResult;
  onNavigate: (tab: ViewTab) => void;
}) {
  const [copied, setCopied] = useState(false);
  const m = result.metrics;
  const detRate = Math.round(m.detection_rate * 100);
  const duration =
    result.started_at && result.completed_at
      ? formatDuration(result.started_at, result.completed_at)
      : null;

  const copyRunId = () => {
    navigator.clipboard.writeText(result.run_id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Run ID row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Run ID</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#f8fafc',
            }}
          >
            <span>{result.run_id}</span>
            <button
              onClick={copyRunId}
              title="Copy run ID"
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? '#34d399' : '#64748b',
                cursor: 'pointer',
                padding: 2,
                lineHeight: 1,
              }}
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onNavigate('timeline')}
            style={{
              background: '#121929',
              border: '1px solid #1c2638',
              borderRadius: 6,
              padding: '6px 12px',
              color: '#06b6d4',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <ExternalLink size={12} />
            Event Timeline
          </button>
          <button
            onClick={() => onNavigate('network')}
            style={{
              background: '#121929',
              border: '1px solid #1c2638',
              borderRadius: 6,
              padding: '6px 12px',
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            Network Map <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Persistence indicator */}
      <PersistenceBadge result={result} />

      {/* Config summary */}
      {result.config && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 11,
            color: '#94a3b8',
            background: '#121929',
            border: '1px solid #1c2638',
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <span>
            <span style={{ color: '#475569' }}>Seed </span>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{result.seed ?? result.config.seed}</span>
          </span>
          <span style={{ color: '#1c2638' }}>·</span>
          <span>
            <span style={{ color: '#475569' }}>Sensitivity </span>
            <span style={{ color: '#10b981' }}>
              {Math.round(result.config.detection_sensitivity * 100)}%
            </span>
          </span>
          <span style={{ color: '#1c2638' }}>·</span>
          <span>
            <span style={{ color: '#475569' }}>Honeypot </span>
            <span style={{ color: result.config.honeypot_enabled ? '#eab308' : '#475569' }}>
              {result.config.honeypot_enabled ? 'Active' : 'Off'}
            </span>
          </span>
          <span style={{ color: '#1c2638' }}>·</span>
          <span>
            <span style={{ color: '#475569' }}>Red Team </span>
            <span style={{ color: result.config.aggressive_red ? '#ef4444' : '#64748b' }}>
              {result.config.aggressive_red ? 'Aggressive' : 'Standard'}
            </span>
          </span>
          {duration && (
            <>
              <span style={{ color: '#1c2638' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} />
                <span>{duration}</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Metric stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <StatBox
          label="Detection Rate"
          value={`${detRate}%`}
          color={detRate >= 70 ? '#10b981' : detRate >= 40 ? '#f59e0b' : '#ef4444'}
        />
        <StatBox
          label="Threats Detected"
          value={`${m.threats_detected} / ${m.threats_generated}`}
          color="#06b6d4"
          sub="of total generated"
        />
        <StatBox
          label="Attacks Blocked"
          value={m.attacks_blocked}
          color="#f59e0b"
        />
        <StatBox
          label="Compromised Assets"
          value={m.compromised_assets ?? 0}
          color={(m.compromised_assets ?? 0) > 0 ? '#ef4444' : '#10b981'}
          sub={(m.compromised_assets ?? 0) === 0 ? 'All systems intact' : 'Network breach detected'}
        />
      </div>

      {/* Node status summary */}
      {result.node_statuses && Object.keys(result.node_statuses).length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
            Final Node States
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(result.node_statuses).map(([nodeId, st]) => {
              const color =
                st === 'compromised' ? '#ef4444' :
                st === 'isolated' ? '#06b6d4' :
                st === 'honeypot_hit' ? '#eab308' :
                st === 'suspicious' ? '#f97316' :
                '#10b981';
              return (
                <div
                  key={nodeId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#121929',
                    border: `1px solid ${color}30`,
                    borderRadius: 5,
                    padding: '4px 8px',
                    fontSize: 11,
                  }}
                >
                  {st === 'honeypot_hit' ? (
                    <Radio size={10} color={color} />
                  ) : (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: color,
                        display: 'inline-block',
                      }}
                    />
                  )}
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{nodeId}</span>
                  <span style={{ color, textTransform: 'uppercase', fontSize: 9, fontWeight: 700 }}>
                    {st.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Sequence Preview */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
            Event Sequence ({result.events.length} events)
          </div>
          <button
            onClick={() => onNavigate('timeline')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#06b6d4',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View full timeline <ArrowRight size={11} />
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 300,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {result.events.map((e, idx) => (
            <div
              key={e.id || idx}
              style={{
                background: '#121929',
                border: '1px solid #1c2638',
                borderRadius: 5,
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ color: '#475569', width: 22, textAlign: 'right', flexShrink: 0 }}>
                  #{idx + 1}
                </span>
                <AgentBadge agent={e.agent} />
                <span
                  style={{
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {e.action}
                </span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', flexShrink: 0 }}>
                  [{e.node_id}]
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <SeverityBadge severity={e.severity} />
                <span
                  style={{
                    fontSize: 10,
                    color: e.success ? '#10b981' : '#f97316',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {e.success ? 'OK' : 'Blkd'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const SimulationLabView: React.FC<SimulationLabViewProps> = ({
  latestResult,
  onRunSimulation,
  loading,
  onNavigate,
  error,
}) => {
  const [seedInput, setSeedInput] = useState<string>('42');
  const [sensitivity, setSensitivity] = useState<number>(0.8);
  const [honeypotEnabled, setHoneypotEnabled] = useState<boolean>(true);
  const [aggressiveRed, setAggressiveRed] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Guard against duplicate submissions
  const submittingRef = useRef(false);

  const handleRandomSeed = () => {
    const r = Math.floor(Math.random() * 90000) + 1000;
    setSeedInput(r.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Duplicate-submission guard
    if (submittingRef.current || loading) return;

    setValidationError(null);
    setSuccessMsg(null);

    // Validate
    const rawSeed = seedInput.trim();
    let parsedSeed: number | undefined;
    if (rawSeed !== '') {
      parsedSeed = parseInt(rawSeed, 10);
      if (isNaN(parsedSeed) || parsedSeed < 0) {
        setValidationError('Seed must be a non-negative integer, or leave empty for random.');
        return;
      }
    }

    const req: SimulationRequest = {
      seed: parsedSeed,
      detection_sensitivity: sensitivity,
      honeypot_enabled: honeypotEnabled,
      aggressive_red: aggressiveRed,
    };

    submittingRef.current = true;
    try {
      await onRunSimulation(req);
      setSuccessMsg('Simulation completed successfully.');
    } finally {
      submittingRef.current = false;
    }
  };

  const displayError = validationError || error;

  return (
    <div
      style={{
        padding: 24,
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        gap: 20,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Left Column: Configuration Panel ── */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          alignSelf: 'start',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Header */}
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Sliders size={16} color="#10b981" />
              Simulation Parameters
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Configure the deterministic seed, Blue Team sensitivity, and scenario toggles.
            </div>
          </div>

          {/* Seed Input */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                Deterministic Seed
              </label>
              <button
                type="button"
                onClick={handleRandomSeed}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={12} /> Randomize
              </button>
            </div>
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="e.g. 42 (leave empty for random)"
              style={{
                width: '100%',
                background: '#121929',
                border: `1px solid ${validationError ? '#ef4444' : '#2a3852'}`,
                borderRadius: 6,
                padding: '8px 12px',
                color: '#f8fafc',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {['42', '1337', '777', '9999'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setSeedInput(preset)}
                  style={{
                    background: '#121929',
                    border: `1px solid ${seedInput === preset ? '#38bdf8' : '#1c2638'}`,
                    color: seedInput === preset ? '#38bdf8' : '#64748b',
                    fontSize: 10,
                    borderRadius: 4,
                    padding: '2px 8px',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Detection Sensitivity Slider */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                Blue Team Detection Sensitivity
              </label>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    sensitivity >= 0.75 ? '#10b981' : sensitivity >= 0.45 ? '#f59e0b' : '#ef4444',
                }}
              >
                {Math.round(sensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginTop: 3 }}>
              <span>Low (10%) — fewer detections</span>
              <span>High (100%)</span>
            </div>
          </div>

          {/* Honeypot Toggle */}
          <label
            style={{
              background: '#121929',
              border: `1px solid ${honeypotEnabled ? '#eab30840' : '#1c2638'}`,
              borderRadius: 6,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Radio size={13} color="#eab308" />
                Active Honeypot Decoy Server
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Triggers immediate alerts on honeypot-1 access
              </div>
            </div>
            <input
              type="checkbox"
              checked={honeypotEnabled}
              onChange={(e) => setHoneypotEnabled(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#eab308', cursor: 'pointer', flexShrink: 0 }}
            />
          </label>

          {/* Aggressive Red Toggle */}
          <label
            style={{
              background: '#121929',
              border: `1px solid ${aggressiveRed ? '#ef444440' : '#1c2638'}`,
              borderRadius: 6,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={13} color="#ef4444" />
                Aggressive Red Team Tactics
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Enables credential spray, file traversal and lateral movement
              </div>
            </div>
            <input
              type="checkbox"
              checked={aggressiveRed}
              onChange={(e) => setAggressiveRed(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#ef4444', cursor: 'pointer', flexShrink: 0 }}
            />
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || submittingRef.current}
            style={{
              marginTop: 4,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 6,
              border: 'none',
              background: loading ? '#0a3d2a' : '#10b981',
              color: '#070a12',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              transition: 'background 0.2s',
            }}
          >
            {loading ? (
              <Activity size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Play size={16} fill="#070a12" />
            )}
            {loading ? 'Simulating Multi-Agent Run…' : 'Execute Simulation'}
          </button>
        </form>

        {/* Status messages */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayError && (
            <div
              style={{
                background: '#2d1216',
                border: '1px solid #7f1d1d',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: 12,
                color: '#f87171',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{displayError}</span>
            </div>
          )}

          {successMsg && !displayError && (
            <div
              style={{
                background: '#0b261d',
                border: '1px solid #065f46',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: 12,
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={14} />
              {successMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column: Telemetry ── */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          alignSelf: 'start',
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Execution Telemetry</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Phased results from the deterministic multi-agent simulation run.
          </div>
        </div>

        {loading ? (
          <RunningIndicator />
        ) : latestResult ? (
          <RunSummaryPanel result={latestResult} onNavigate={onNavigate} />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              gap: 12,
              padding: '60px 0',
            }}
          >
            <Shield size={40} color="#2a3852" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>
                Ready to simulate corporate sabotage and defense
              </div>
              <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                Configure parameters on the left and click Execute Simulation.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
