import React from 'react';
import { Wifi, WifiOff, Database, DatabaseZap, Play, Activity, RefreshCw } from 'lucide-react';
import type { HealthStatus, ViewTab } from '../types';

interface TopbarProps {
  currentTab: ViewTab;
  health: HealthStatus | null;
  loading: boolean;
  onQuickSimulate: () => void;
  onRefresh: () => void;
  backendError?: string | null;
}

const TAB_TITLES: Record<ViewTab, string> = {
  overview: 'Security Overview',
  network: 'Enterprise Network Topology',
  simulation: 'Multi-Agent Simulation Lab',
  comparison: 'Defense Posture Comparison',
  rl: 'Reinforcement Learning Defense Lab',
  timeline: 'Security Event Timeline & Audit Log',
  history: 'Simulation Run History',
  analytics: 'Security Performance Analytics',
  settings: 'System & Persistence Settings',
};

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  health,
  loading,
  onQuickSimulate,
  onRefresh,
  backendError,
}) => {
  const isOnline = health !== null && !backendError;
  const isSupabase = health?.persistence_backend === 'supabase' && health?.supabase_connected;

  return (
    <header
      style={{
        height: 60,
        background: '#0d121f',
        borderBottom: '1px solid #1c2638',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      {/* Current View Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', margin: 0 }}>
          {TAB_TITLES[currentTab]}
        </h1>
        {loading && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: '#06b6d420',
              color: '#06b6d4',
              border: '1px solid #06b6d440',
            }}
          >
            <Activity size={12} style={{ animation: 'spin 1.2s linear infinite' }} />
            Simulating Agents...
          </span>
        )}
      </div>

      {/* Status Badges & Quick Action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Backend Online / Offline */}
        <div
          title={isOnline ? 'FastAPI Backend connected' : backendError || 'Backend unreachable'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            background: isOnline ? '#0b261d' : '#2d1216',
            color: isOnline ? '#34d399' : '#f87171',
            border: `1px solid ${isOnline ? '#065f46' : '#7f1d1d'}`,
          }}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isOnline ? 'API Connected' : 'API Offline'}</span>
        </div>

        {/* Persistence Status */}
        <div
          title={health?.persistence_status || 'Storage status'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            background: isSupabase ? '#1e1b4b' : '#141b2a',
            color: isSupabase ? '#a78bfa' : '#94a3b8',
            border: `1px solid ${isSupabase ? '#4338ca' : '#2a3852'}`,
          }}
        >
          {isSupabase ? <Database size={14} /> : <DatabaseZap size={14} />}
          <span>{isSupabase ? 'Supabase Active' : 'In-Memory Mode'}</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          title="Refresh dashboard data"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            border: '1px solid #1c2638',
            background: '#121929',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
        </button>

        {/* Quick Launch Simulation Button */}
        <button
          onClick={onQuickSimulate}
          disabled={loading || !isOnline}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            background: '#10b981',
            color: '#070a12',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || !isOnline ? 'not-allowed' : 'pointer',
            opacity: loading || !isOnline ? 0.5 : 1,
            transition: 'background 0.15s ease',
          }}
        >
          {loading ? (
            <Activity size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Play size={14} fill="#070a12" />
          )}
          <span>{loading ? 'Running...' : 'Run Simulation'}</span>
        </button>
      </div>
    </header>
  );
};
