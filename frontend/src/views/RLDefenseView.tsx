import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  FileCode,
  Activity,
} from 'lucide-react';
import type { RLStatus, RLEvaluationBenchmark } from '../types';
import { api } from '../api';

export const RLDefenseView: React.FC = () => {
  const [status, setStatus] = useState<RLStatus | null>(null);
  const [benchmark, setBenchmark] = useState<RLEvaluationBenchmark | null>(null);
  const [, setLoadingStatus] = useState<boolean>(true);
  const [training, setTraining] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await api.getRLStatus();
      setStatus(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve RL status.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const handleRunEvaluation = useCallback(async () => {
    setEvaluating(true);
    setError(null);
    setNotice(null);
    try {
      const results = await api.evaluateRL(25);
      setBenchmark(results);
      setNotice('Completed 25-episode evaluation across RL policy and heuristic baselines.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    handleRunEvaluation();
  }, [fetchStatus, handleRunEvaluation]);

  const handleTrain = async () => {
    setTraining(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.trainRL({ total_timesteps: 5000, seed: 42 });
      setNotice(
        `PPO training completed successfully (${res.total_timesteps} timesteps). Model saved locally as ${res.saved_path}.`
      );
      if (res.evaluation) {
        setBenchmark(res.evaluation);
      }
      await fetchStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Training failed.');
    } finally {
      setTraining(false);
    }
  };

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
      {/* Experimental Disclaimer Banner */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderLeft: '4px solid #38bdf8',
          borderRadius: 8,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrainCircuit size={22} color="#38bdf8" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              Reinforcement Learning Defense Foundation (Gymnasium + Stable-Baselines3)
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Autonomous Blue Team agent trained in an isolated discrete Markov Decision Process (MDP).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: '#0b261d',
              color: '#34d399',
              border: '1px solid #065f46',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            EXPERIMENTAL PROTOTYPE
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: '#121929',
              color: '#94a3b8',
              border: '1px solid #1c2638',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            NO REAL NETWORKS
          </span>
        </div>
      </div>

      {notice && (
        <div
          style={{
            background: '#0b261d',
            border: '1px solid #065f46',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 12,
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={15} />
          <span>{notice}</span>
        </div>
      )}

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
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Model Status & Training Controls Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
        {/* Model Status Card */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Cpu size={15} color="#06b6d4" /> Model Weights & Pipeline State
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: status?.model_trained ? '#10b981' : '#f59e0b',
                  background: status?.model_trained ? '#0b261d' : '#2e240a',
                  border: `1px solid ${status?.model_trained ? '#065f46' : '#854d0e'}`,
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                {status?.model_trained ? 'TRAINED WEIGHTS READY' : 'UNTRAINED BASELINE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
              <div style={{ background: '#121929', padding: '10px 12px', borderRadius: 6, border: '1px solid #1c2638' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Algorithm</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                  PPO (MlpPolicy)
                </div>
              </div>
              <div style={{ background: '#121929', padding: '10px 12px', borderRadius: 6, border: '1px solid #1c2638' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Artifact File</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace', marginTop: 2 }}>
                  {status?.model_details ? status.model_details.file : 'ppo_defense.zip'}
                </div>
              </div>
              <div style={{ background: '#121929', padding: '10px 12px', borderRadius: 6, border: '1px solid #1c2638' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Local Footprint</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginTop: 2 }}>
                  {status?.model_details ? `${status.model_details.size_kb} KB` : 'None (Untrained)'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
              Artifacts are saved locally in <code style={{ color: '#94a3b8' }}>backend/rl/models/</code> and excluded from Git tracking to preserve codebase integrity.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={handleTrain}
              disabled={training}
              style={{
                background: training ? '#0a3d2a' : '#10b981',
                color: '#070a12',
                border: 'none',
                borderRadius: 6,
                padding: '9px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: training ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {training ? <Activity size={13} className="animate-spin" /> : <Play size={13} fill="#070a12" />}
              <span>{training ? 'Training PPO Agent (5,000 Steps)…' : 'Train PPO Agent'}</span>
            </button>

            <button
              onClick={handleRunEvaluation}
              disabled={evaluating}
              style={{
                background: '#121929',
                border: '1px solid #1c2638',
                color: '#94a3b8',
                borderRadius: 6,
                padding: '9px 16px',
                fontSize: 12,
                fontWeight: 600,
                cursor: evaluating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RotateCcw size={12} className={evaluating ? 'animate-spin' : ''} />
              <span>{evaluating ? 'Evaluating…' : 'Re-Evaluate Baselines'}</span>
            </button>
          </div>
        </div>

        {/* Gymnasium Environment Specs Card */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1c2638',
            borderRadius: 8,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileCode size={15} color="#38bdf8" /> Formal Environment MDP Specification
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
            <div>
              <div style={{ color: '#64748b', textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>
                Observation Space: Box(11,) in [0.0, 1.0]
              </div>
              <div style={{ color: '#cbd5e1', marginTop: 2 }}>
                Indices 0..8: Normalized security state of 9 network nodes. Index 9: Honeypot tripped flag. Index 10: Normalized attack phase.
              </div>
            </div>

            <div>
              <div style={{ color: '#64748b', textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>
                Action Space: Discrete(6)
              </div>
              <div style={{ color: '#94a3b8', marginTop: 2 }}>
                0: Passive Monitor · 1: Isolate Workstation · 2: Freeze Identity · 3: Isolate App Server · 4: Lockdown DB · 5: Block Firewall
              </div>
            </div>

            <div>
              <div style={{ color: '#64748b', textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>
                Reward Function
              </div>
              <div style={{ color: '#94a3b8', marginTop: 2 }}>
                +8.0 containment · +5.0 honeypot trip · -2.0 false positive · -10.0 database breach · +15.0 episode mission bonus
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empirical Benchmark Scoreboard */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
            Empirical Benchmark Scoreboard (25 Seeded Episodes)
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Head-to-head performance across the trained RL agent and deterministic baselines under identical seeds.
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#121929', borderBottom: '1px solid #1c2638' }}>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                  Agent Architecture
                </th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                  Policy Type
                </th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                  Mean Cumulative Reward
                </th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                  Reward Std Dev
                </th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                  Data Protection Rate
                </th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                  Avg Attacks Blocked
                </th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                  False Isolations
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Trained RL Agent */}
              <tr style={{ borderBottom: '1px solid #141b2a', background: '#0b192e20' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#38bdf8' }}>
                  Trained RL Defender
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                  PPO (Neural Network)
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: (benchmark?.rl_trained_agent?.mean_reward ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
                  {benchmark?.rl_trained_agent ? benchmark.rl_trained_agent.mean_reward : 'Run Training'}
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                  {benchmark?.rl_trained_agent ? `±${benchmark.rl_trained_agent.std_reward}` : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>
                  {benchmark?.rl_trained_agent ? `${Math.round(benchmark.rl_trained_agent.data_protection_rate * 100)}%` : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#06b6d4' }}>
                  {benchmark?.rl_trained_agent ? benchmark.rl_trained_agent.avg_attacks_blocked : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#f59e0b' }}>
                  {benchmark?.rl_trained_agent ? benchmark.rl_trained_agent.avg_false_isolations : '—'}
                </td>
              </tr>

              {/* 2. Rule-Based Baseline */}
              <tr style={{ borderBottom: '1px solid #141b2a' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f8fafc' }}>
                  Rule-Based Defender
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                  Heuristic State Rules
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: (benchmark?.rule_based_baseline?.mean_reward ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
                  {benchmark?.rule_based_baseline ? benchmark.rule_based_baseline.mean_reward : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                  {benchmark?.rule_based_baseline ? `±${benchmark.rule_based_baseline.std_reward}` : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>
                  {benchmark?.rule_based_baseline ? `${Math.round(benchmark.rule_based_baseline.data_protection_rate * 100)}%` : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#06b6d4' }}>
                  {benchmark?.rule_based_baseline ? benchmark.rule_based_baseline.avg_attacks_blocked : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#f59e0b' }}>
                  {benchmark?.rule_based_baseline ? benchmark.rule_based_baseline.avg_false_isolations : '—'}
                </td>
              </tr>

              {/* 3. Random Baseline */}
              <tr>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b' }}>
                  Random Baseline
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  Uniform Stochastic Choice
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#ef4444' }}>
                  {benchmark?.random_baseline ? benchmark.random_baseline.mean_reward : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {benchmark?.random_baseline ? `±${benchmark.random_baseline.std_reward}` : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                  {benchmark?.random_baseline ? `${Math.round(benchmark.random_baseline.data_protection_rate * 100)}%` : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {benchmark?.random_baseline ? benchmark.random_baseline.avg_attacks_blocked : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {benchmark?.random_baseline ? benchmark.random_baseline.avg_false_isolations : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
