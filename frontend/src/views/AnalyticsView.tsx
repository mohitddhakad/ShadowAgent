import React, { useState, useEffect, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Target,
  AlertTriangle,
  Clock,
  RefreshCw,
  Activity,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import type { AnalyticsSummary, SimulationResult, RunSummary } from '../types';
import { api } from '../api';
import { MetricCard } from '../components/MetricCard';

interface AnalyticsViewProps {
  latestResult: SimulationResult | null;
  runs: RunSummary[];
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const AGENT_COLORS: Record<string, string> = {
  'Red Team': '#ef4444',
  'Blue Team': '#06b6d4',
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  latestResult,
  runs,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to retrieve analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics, latestResult, runs.length]);

  const hasData = analytics && analytics.has_data && analytics.total_runs > 0;

  // Prepare Pie Chart data for Severity
  const severityPieData = analytics
    ? Object.entries(analytics.severity_distribution)
        .filter(([_, count]) => count > 0)
        .map(([sev, count]) => ({
          name: sev.toUpperCase(),
          value: count,
          color: SEVERITY_COLORS[sev] ?? '#94a3b8',
        }))
    : [];

  // Prepare Pie Chart data for Red vs Blue
  const agentPieData = analytics
    ? Object.entries(analytics.agent_distribution)
        .filter(([_, count]) => count > 0)
        .map(([agent, count]) => ({
          name: agent,
          value: count,
          color: AGENT_COLORS[agent] ?? '#94a3b8',
        }))
    : [];

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header bar */}
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
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={18} color="#10b981" />
            Security Analytics & Telemetry Benchmarks
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Empirical aggregations compiled directly from persisted simulation runs.
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          style={{
            background: '#121929',
            border: '1px solid #1c2638',
            color: '#94a3b8',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing…' : 'Refresh Telemetry'}
        </button>
      </div>

      {fetchError && (
        <div
          style={{
            background: '#2d1216',
            border: '1px solid #7f1d1d',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 12,
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={14} />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Top Aggregation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <MetricCard
          label="Total Simulations"
          value={analytics ? analytics.total_runs : 0}
          subtext="Persisted audit runs"
          icon={<Layers size={18} />}
          color="#38bdf8"
        />
        <MetricCard
          label="Mean Detection Rate"
          value={analytics ? `${Math.round(analytics.overall_detection_rate * 100)}%` : '0%'}
          subtext={`${analytics ? analytics.total_threats_detected : 0} of ${analytics ? analytics.total_threats_generated : 0} threats`}
          icon={<TrendingUp size={18} />}
          color="#10b981"
        />
        <MetricCard
          label="Containment Rate"
          value={analytics ? `${Math.round(analytics.overall_containment_rate * 100)}%` : '0%'}
          subtext={`${analytics ? analytics.total_containment_success : 0} attacks mitigated`}
          icon={<ShieldCheck size={18} />}
          color="#06b6d4"
        />
        <MetricCard
          label="False Positive Rate"
          value={analytics ? `${analytics.avg_false_positives_per_run} / run` : '0 / run'}
          subtext={`${analytics ? analytics.total_false_positives : 0} total false alarms`}
          icon={<ShieldAlert size={18} />}
          color="#f59e0b"
        />
        <MetricCard
          label="Compromised Assets"
          value={analytics ? analytics.total_compromised_assets : 0}
          subtext={`Avg ${analytics ? analytics.avg_compromised_assets_per_run : 0} per run`}
          icon={<Target size={18} />}
          color="#ef4444"
        />
      </div>

      {/* Historical Detection & Containment Trajectory Chart */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              Historical Performance Trajectory (% across Runs)
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Chronological detection rate vs containment rate trends across completed runs.
            </div>
          </div>
          {analytics && (
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} color="#8b5cf6" />
                <span>Avg Duration: <strong style={{ color: '#f8fafc' }}>{analytics.avg_duration_ms} ms</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Activity size={12} color="#06b6d4" />
                <span>Avg Response: <strong style={{ color: '#f8fafc' }}>{analytics.avg_response_time_ms} ms</strong></span>
              </div>
            </div>
          )}
        </div>

        {hasData && analytics && analytics.run_trends.length > 0 ? (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.run_trends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2638" />
                <XAxis dataKey="run_index" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `Run #${val}`} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 6, color: '#f8fafc' }}
                  labelFormatter={(val) => `Simulation Run #${val}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Line
                  type="monotone"
                  dataKey="detection_rate"
                  name="Detection Rate (%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="containment_rate"
                  name="Containment Rate (%)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              height: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              gap: 8,
              border: '1px dashed #1c2638',
              borderRadius: 6,
            }}
          >
            <Clock size={28} color="#2a3852" />
            <div style={{ fontSize: 13, color: '#475569' }}>No persisted runs available to graph trends.</div>
            <div style={{ fontSize: 11, color: '#334155' }}>
              Execute simulations in the Simulation Lab to build empirical analytics.
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: Threat Distribution vs Red/Blue Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Severity Distribution */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
            Cumulative Event Severity Distribution
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
            Aggregated classification across all audited simulation events.
          </div>

          {severityPieData.length > 0 ? (
            <div style={{ width: '100%', height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 6, color: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                fontSize: 12,
              }}
            >
              No severity distribution data available.
            </div>
          )}
        </div>

        {/* Red Team vs Blue Team Activity */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
            Red Team vs Blue Team Action Volume
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
            Total adversarial threat vectors generated vs defensive actions deployed.
          </div>

          {agentPieData.length > 0 ? (
            <div style={{ width: '100%', height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={agentPieData}
                  margin={{ top: 10, right: 30, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c2638" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 6, color: '#f8fafc' }} />
                  <Bar dataKey="value" name="Actions Logged">
                    {agentPieData.map((entry, index) => (
                      <Cell key={`agent-cell-${index}`} fill={entry.color} />
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
                color: '#475569',
                fontSize: 12,
              }}
            >
              No team action data recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
