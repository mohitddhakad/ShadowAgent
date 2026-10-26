import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Target,
  Activity,
  Play,
  ArrowRight,
  Server,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type {
  SimulationResult,
  RunSummary,
  NetworkTopology,
  ViewTab,
} from '../types';
import { MetricCard } from '../components/MetricCard';
import { AgentBadge, SeverityBadge } from '../components/StatusBadge';

interface OverviewViewProps {
  latestResult: SimulationResult | null;
  runs: RunSummary[];
  topology: NetworkTopology | null;
  onNavigate: (tab: ViewTab) => void;
  onQuickSimulate: () => void;
  loading: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  latestResult,
  runs,
  topology,
  onNavigate,
  onQuickSimulate,
  loading,
}) => {
  // Aggregate stats
  const totalRuns = runs.length;
  const metrics = latestResult?.metrics;

  const detectionRate = metrics ? Math.round(metrics.detection_rate * 100) : 0;
  const threatsDetected = metrics?.threats_detected ?? 0;
  const threatsGenerated = metrics?.threats_generated ?? 0;
  const attacksBlocked = metrics?.attacks_blocked ?? 0;

  // Node health calculations
  const totalNodes = topology?.nodes.length ?? 0;
  const nodeStatuses = latestResult?.node_statuses ?? {};
  let compromisedCount = 0;
  let isolatedCount = 0;
  let honeypotHitCount = 0;
  let cleanCount = 0;

  if (topology) {
    topology.nodes.forEach((n) => {
      const st = nodeStatuses[n.id] ?? 'clean';
      if (st === 'compromised') compromisedCount++;
      else if (st === 'isolated') isolatedCount++;
      else if (st === 'honeypot_hit') honeypotHitCount++;
      else cleanCount++;
    });
  }

  // Chart data from current run metrics
  const chartData = metrics
    ? [
        { name: 'Threats Gen', value: threatsGenerated, fill: '#f59e0b' },
        { name: 'Detected', value: threatsDetected, fill: '#06b6d4' },
        { name: 'Blocked', value: attacksBlocked, fill: '#10b981' },
        { name: 'Compromised', value: metrics.compromised_assets ?? 0, fill: '#ef4444' },
      ]
    : [];

  const recentEvents = latestResult?.events.slice(-6).reverse() ?? [];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', height: '100%' }}>
      {/* Top 4 Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          label="Total Simulations"
          value={totalRuns}
          subtext={totalRuns > 0 ? `${totalRuns} run records stored` : 'Awaiting first run'}
          icon={<Activity size={18} />}
          color="#3b82f6"
        />
        <MetricCard
          label="Threats Detected"
          value={metrics ? `${threatsDetected} / ${threatsGenerated}` : '0 / 0'}
          subtext={threatsGenerated > 0 ? `${threatsDetected} adversarial attempts caught` : 'No threat data'}
          icon={<Target size={18} />}
          color="#f59e0b"
          badge={metrics ? `${detectionRate}% rate` : undefined}
        />
        <MetricCard
          label="Containment Effectiveness"
          value={metrics ? `${attacksBlocked} Blocked` : '0'}
          subtext={metrics?.data_protected ? '✓ Mission Data Protected' : 'Data at risk'}
          icon={<ShieldCheck size={18} />}
          color="#10b981"
          badge={metrics?.data_protected ? 'Protected' : 'Compromised'}
        />
        <MetricCard
          label="Network Integrity"
          value={totalNodes > 0 ? `${cleanCount} / ${totalNodes} Clean` : '9 / 9'}
          subtext={
            compromisedCount > 0
              ? `${compromisedCount} asset(s) compromised`
              : 'All nodes healthy'
          }
          icon={<Server size={18} />}
          color={compromisedCount > 0 ? '#ef4444' : '#10b981'}
        />
      </div>

      {/* Middle Section: Recent Run + Network Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
        {/* Latest Run Activity */}
        <div
          style={{
            background: '#121929',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                Latest Simulation Status
              </div>
              <button
                onClick={() => onNavigate('simulation')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Simulation Lab <ArrowRight size={13} />
              </button>
            </div>

            {latestResult ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ background: '#0d121f', padding: '10px 14px', borderRadius: 6, border: '1px solid #1c2638' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Run ID</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace', marginTop: 2 }}>
                    {latestResult.run_id.slice(0, 8)}...
                  </div>
                </div>
                <div style={{ background: '#0d121f', padding: '10px 14px', borderRadius: 6, border: '1px solid #1c2638' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Deterministic Seed</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8', fontFamily: 'monospace', marginTop: 2 }}>
                    {latestResult.seed}
                  </div>
                </div>
                <div style={{ background: '#0d121f', padding: '10px 14px', borderRadius: 6, border: '1px solid #1c2638' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Execution Latency</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginTop: 2 }}>
                    {latestResult.metrics.response_time_ms} ms
                  </div>
                </div>
                <div style={{ background: '#0d121f', padding: '10px 14px', borderRadius: 6, border: '1px solid #1c2638' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Total Events</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>
                    {latestResult.events.length}
                  </div>
                </div>
                <div style={{ background: '#0d121f', padding: '10px 14px', borderRadius: 6, border: '1px solid #1c2638' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Persistence Backend</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', textTransform: 'capitalize', marginTop: 2 }}>
                    {latestResult.persistence_backend ?? 'In-Memory'}
                  </div>
                </div>
                <div style={{ background: '#0d121f', padding: '10px 14px', borderRadius: 6, border: '1px solid #1c2638' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>False Positives</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginTop: 2 }}>
                    {latestResult.metrics.false_positives ?? 0}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#0d121f',
                  border: '1px dashed #1c2638',
                  borderRadius: 6,
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                No simulation run loaded yet in this session.
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              onClick={onQuickSimulate}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#10b981',
                color: '#070a12',
                fontWeight: 600,
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Play size={14} fill="#070a12" />
              {loading ? 'Simulating...' : 'Run New Simulation'}
            </button>
            <button
              onClick={() => onNavigate('network')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #1c2638',
                background: '#0d121f',
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Inspect Topology
            </button>
          </div>
        </div>

        {/* Network Health Summary */}
        <div
          style={{
            background: '#121929',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                Asset Health Breakdown
              </div>
              <button
                onClick={() => onNavigate('network')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                View Graph <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  Clean / Operational
                </span>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{cleanCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} />
                  Isolated / Contained
                </span>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{isolatedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                  Decoy / Honeypot Hit
                </span>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{honeypotHitCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  Compromised
                </span>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{compromisedCount}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              background: '#0d121f',
              border: '1px solid #1c2638',
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 11,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShieldAlert size={14} color="#f59e0b" />
            <span>Fictional enterprise network graph with 9 segmented nodes.</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Chart & Recent Security Events */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Security Metrics Chart */}
        <div
          style={{
            background: '#121929',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>
            Adversarial vs Defensive Balance
          </div>
          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 6, color: '#f8fafc' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: 13,
              }}
            >
              Run a simulation to generate metric telemetry.
            </div>
          )}
        </div>

        {/* Recent Events Feed */}
        <div
          style={{
            background: '#121929',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              Recent Security Events
            </div>
            <button
              onClick={() => onNavigate('timeline')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Full Timeline <ArrowRight size={13} />
            </button>
          </div>

          {recentEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 200 }}>
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    background: '#0d121f',
                    border: '1px solid #1c2638',
                    borderRadius: 6,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AgentBadge agent={evt.agent} />
                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>{evt.action.replace('_', ' ')}</span>
                    <span style={{ color: '#64748b', fontSize: 11 }}>[{evt.node_id}]</span>
                  </div>
                  <SeverityBadge severity={evt.severity} />
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: 13,
              }}
            >
              No security events recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
