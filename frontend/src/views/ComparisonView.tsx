import React, { useState } from 'react';
import {
  Scale,
  Sparkles,
  ArrowRight,
  Activity,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { ComparisonResult, CompareRequest, ViewTab } from '../types';
import { api } from '../api';

interface ComparisonViewProps {
  onNavigate: (tab: ViewTab) => void;
  onRunSelected?: (runId: string) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ onNavigate }) => {
  // Configuration A (Baseline)
  const [sensitivityA, setSensitivityA] = useState<number>(0.4);
  const [honeypotA, setHoneypotA] = useState<boolean>(false);
  const [aggressiveA, setAggressiveA] = useState<boolean>(false);

  // Configuration B (Enhanced)
  const [sensitivityB, setSensitivityB] = useState<number>(0.85);
  const [honeypotB, setHoneypotB] = useState<boolean>(true);
  const [aggressiveB, setAggressiveB] = useState<boolean>(false);

  // Common seed for fairness
  const [seedInput, setSeedInput] = useState<string>('42');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const handleRandomSeed = () => {
    const r = Math.floor(Math.random() * 90000) + 1000;
    setSeedInput(r.toString());
  };

  const handleRunComparison = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const parsedSeed = seedInput.trim() !== '' ? parseInt(seedInput.trim(), 10) : 42;

    const payload: CompareRequest = {
      seed: isNaN(parsedSeed) ? 42 : parsedSeed,
      config_a: {
        detection_sensitivity: sensitivityA,
        honeypot_enabled: honeypotA,
        aggressive_red: aggressiveA,
      },
      config_b: {
        detection_sensitivity: sensitivityB,
        honeypot_enabled: honeypotB,
        aggressive_red: aggressiveB,
      },
    };

    try {
      const data = await api.compare(payload);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Comparison execution failed.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart comparison data
  const chartData = result
    ? [
        {
          metric: 'Detection Rate',
          'Config A (Baseline)': Math.round(result.run_a.metrics.detection_rate * 100),
          'Config B (Enhanced)': Math.round(result.run_b.metrics.detection_rate * 100),
          unit: '%',
        },
        {
          metric: 'Attacks Blocked',
          'Config A (Baseline)': result.run_a.metrics.attacks_blocked,
          'Config B (Enhanced)': result.run_b.metrics.attacks_blocked,
          unit: '',
        },
        {
          metric: 'Compromised Assets',
          'Config A (Baseline)': result.run_a.metrics.compromised_assets ?? 0,
          'Config B (Enhanced)': result.run_b.metrics.compromised_assets ?? 0,
          unit: '',
        },
        {
          metric: 'False Positives',
          'Config A (Baseline)': result.run_a.metrics.false_positives ?? 0,
          'Config B (Enhanced)': result.run_b.metrics.false_positives ?? 0,
          unit: '',
        },
        {
          metric: 'Total Events',
          'Config A (Baseline)': result.run_a.metrics.total_events,
          'Config B (Enhanced)': result.run_b.metrics.total_events,
          unit: '',
        },
      ]
    : [];

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scale size={18} color="#38bdf8" />
            Empirical Defense Posture Comparison
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Simulate and benchmark two defense configurations under strictly identical network and seed conditions.
          </div>
        </div>

        {/* Global Seed Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Fairness Seed:</span>
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            style={{
              width: 80,
              background: '#121929',
              border: '1px solid #2a3852',
              borderRadius: 6,
              padding: '4px 8px',
              color: '#f8fafc',
              fontSize: 12,
              fontFamily: 'monospace',
              textAlign: 'center',
            }}
          />
          <button
            type="button"
            onClick={handleRandomSeed}
            style={{
              background: '#121929',
              border: '1px solid #1c2638',
              color: '#38bdf8',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Sparkles size={11} /> Randomize
          </button>
        </div>
      </div>

      {error && (
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
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Two Configuration Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Configuration A */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1c2638', paddingBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
              Posture A (Baseline Defense)
            </div>
            <span style={{ fontSize: 10, background: '#1c2638', color: '#94a3b8', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
              REFERENCE
            </span>
          </div>

          {/* Sensitivity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>Detection Sensitivity</span>
              <span style={{ fontWeight: 700, color: '#94a3b8' }}>{Math.round(sensitivityA * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={sensitivityA}
              onChange={(e) => setSensitivityA(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#94a3b8' }}
            />
          </div>

          {/* Honeypot & Aggressive Toggles */}
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={honeypotA}
                onChange={(e) => setHoneypotA(e.target.checked)}
                style={{ accentColor: '#eab308' }}
              />
              Honeypot Monitoring
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={aggressiveA}
                onChange={(e) => setAggressiveA(e.target.checked)}
                style={{ accentColor: '#ef4444' }}
              />
              Aggressive Red Team
            </label>
          </div>
        </div>

        {/* Configuration B */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #065f46',
            borderRadius: 8,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1c2638', paddingBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
              Posture B (Hardened Defense)
            </div>
            <span style={{ fontSize: 10, background: '#0b261d', color: '#34d399', border: '1px solid #065f46', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
              CANDIDATE
            </span>
          </div>

          {/* Sensitivity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>Detection Sensitivity</span>
              <span style={{ fontWeight: 700, color: '#10b981' }}>{Math.round(sensitivityB * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={sensitivityB}
              onChange={(e) => setSensitivityB(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
          </div>

          {/* Honeypot & Aggressive Toggles */}
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f8fafc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={honeypotB}
                onChange={(e) => setHoneypotB(e.target.checked)}
                style={{ accentColor: '#eab308' }}
              />
              Honeypot Monitoring
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f8fafc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={aggressiveB}
                onChange={(e) => setAggressiveB(e.target.checked)}
                style={{ accentColor: '#ef4444' }}
              />
              Aggressive Red Team
            </label>
          </div>
        </div>
      </div>

      {/* Execute Comparison Button */}
      <button
        onClick={() => handleRunComparison()}
        disabled={loading}
        style={{
          padding: '12px 20px',
          background: loading ? '#0a3d2a' : '#10b981',
          color: '#070a12',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: loading ? 0.75 : 1,
        }}
      >
        {loading ? (
          <Activity size={16} className="animate-spin" />
        ) : (
          <Scale size={16} />
        )}
        <span>{loading ? 'Executing Dual Deterministic Runs…' : 'Execute Side-by-Side Comparison'}</span>
      </button>

      {/* Comparison Results Section */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Analysis Synthesis Banner */}
          <div
            style={{
              background: '#0d121f',
              border: '1px solid #1c2638',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                Comparative Evaluation Synthesis
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                {result.analysis}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#64748b', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span>Run A ID: <strong style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{result.run_a.run_id.slice(0, 8)}…</strong></span>
                  <span>Run B ID: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{result.run_b.run_id.slice(0, 8)}…</strong></span>
                  <span>Seed: <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{result.seed}</strong></span>
                </div>
                <button
                  onClick={() => onNavigate('history')}
                  style={{
                    background: '#121929',
                    border: '1px solid #1c2638',
                    color: '#38bdf8',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>Inspect Runs</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Metric Comparison Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Detection Rate</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>
                  {Math.round(result.run_a.metrics.detection_rate * 100)}%
                </span>
                <span style={{ color: '#475569' }}>→</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                  {Math.round(result.run_b.metrics.detection_rate * 100)}%
                </span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: result.diff.detection_rate_delta >= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>
                {result.diff.detection_rate_delta >= 0 ? '+' : ''}
                {Math.round(result.diff.detection_rate_delta * 100)}% delta
              </div>
            </div>

            <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Attacks Blocked</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>
                  {result.run_a.metrics.attacks_blocked}
                </span>
                <span style={{ color: '#475569' }}>→</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#06b6d4' }}>
                  {result.run_b.metrics.attacks_blocked}
                </span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: result.diff.containment_success_delta >= 0 ? '#06b6d4' : '#ef4444', marginTop: 4 }}>
                {result.diff.containment_success_delta >= 0 ? '+' : ''}
                {result.diff.containment_success_delta} contained
              </div>
            </div>

            <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Compromised Assets</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>
                  {result.run_a.metrics.compromised_assets ?? 0}
                </span>
                <span style={{ color: '#475569' }}>→</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: (result.run_b.metrics.compromised_assets ?? 0) === 0 ? '#10b981' : '#ef4444' }}>
                  {result.run_b.metrics.compromised_assets ?? 0}
                </span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: result.diff.compromised_assets_delta <= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>
                {result.diff.compromised_assets_delta > 0 ? '+' : ''}
                {result.diff.compromised_assets_delta} net change
              </div>
            </div>

            <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>False Positives</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>
                  {result.run_a.metrics.false_positives ?? 0}
                </span>
                <span style={{ color: '#475569' }}>→</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
                  {result.run_b.metrics.false_positives ?? 0}
                </span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: result.diff.false_positives_delta <= 0 ? '#10b981' : '#f59e0b', marginTop: 4 }}>
                {result.diff.false_positives_delta > 0 ? '+' : ''}
                {result.diff.false_positives_delta} alarms
              </div>
            </div>

            <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Timeline Length</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>
                  {result.run_a.metrics.simulation_duration_ms}ms
                </span>
                <span style={{ color: '#475569' }}>→</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa' }}>
                  {result.run_b.metrics.simulation_duration_ms}ms
                </span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', marginTop: 4 }}>
                {result.diff.runtime_ms_delta > 0 ? '+' : ''}
                {result.diff.runtime_ms_delta}ms duration
              </div>
            </div>
          </div>

          {/* Visual Comparison Chart */}
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
              Side-by-Side Metric Visualizer
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
              Comparative output between Posture A (Baseline) and Posture B (Hardened).
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c2638" />
                  <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 6, color: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  <Bar dataKey="Config A (Baseline)" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Config B (Enhanced)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metric Definitions & Simulation Limitations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={14} /> Metric Definitions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(result.metric_definitions).map(([k, desc]) => (
                  <div key={k} style={{ fontSize: 11 }}>
                    <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{k}:</strong>{' '}
                    <span style={{ color: '#94a3b8' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#0d121f', border: '1px solid #1c2638', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> Simulation Limitations
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
