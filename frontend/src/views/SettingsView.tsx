import React, { useState } from 'react';
import {
  Settings,
  Server,
  Database,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { HealthStatus } from '../types';
import { api } from '../api';

interface SettingsViewProps {
  health: HealthStatus | null;
  onRefreshHealth: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  health,
  onRefreshHealth,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await onRefreshHealth();
      setTestResult('Health probe successful. API and persistence layer responsive.');
    } catch {
      setTestResult('Connection failed. Backend may be offline.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%' }}>
      {/* Settings Header */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={18} color="#06b6d4" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
            System & Architecture Settings
          </span>
        </div>
        <button
          onClick={handleTestConnection}
          disabled={testing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#121929',
            border: '1px solid #2a3852',
            color: '#f8fafc',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: testing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={13} style={{ animation: testing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{testing ? 'Testing...' : 'Test Backend Connection'}</span>
        </button>
      </div>

      {testResult && (
        <div
          style={{
            background: testResult.includes('successful') ? '#0b261d' : '#2d1216',
            border: `1px solid ${testResult.includes('successful') ? '#065f46' : '#7f1d1d'}`,
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 12,
            color: testResult.includes('successful') ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {testResult.includes('successful') ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{testResult}</span>
        </div>
      )}

      {/* Connectivity & Diagnostic Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {/* Backend API Service */}
        <div style={{ background: '#121929', border: '1px solid #1c2638', borderRadius: 8, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Server size={18} color="#38bdf8" />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>FastAPI Backend Service</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Active Base URL:</span>
              <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>{api.getBaseUrl()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Status:</span>
              <span style={{ color: health ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {health ? 'Operational' : 'Unreachable'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>API Engine Version:</span>
              <span style={{ color: '#94a3b8' }}>{health?.version ?? 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Database Persistence */}
        <div style={{ background: '#121929', border: '1px solid #1c2638', borderRadius: 8, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Database size={18} color="#a78bfa" />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Database Persistence</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Active Storage Engine:</span>
              <span
                style={{
                  color: health?.supabase_connected
                    ? '#a78bfa'
                    : health?.supabase_configured
                    ? '#f59e0b'
                    : '#94a3b8',
                  fontWeight: 600,
                }}
              >
                {health?.supabase_connected
                  ? 'Supabase PostgreSQL'
                  : health?.supabase_configured
                  ? 'In-Memory Fallback (Pending Migration)'
                  : 'In-Memory'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Storage Adapter:</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                {health?.storage_adapter ?? (health?.supabase_configured ? 'SupabaseRepository' : 'InMemoryRepository')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Supabase Configured:</span>
              <span style={{ color: health?.supabase_configured ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                {health?.supabase_configured ? 'Yes (backend/.env)' : 'No (Using In-Memory)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Supabase Connected:</span>
              <span
                style={{
                  color: health?.supabase_connected ? '#10b981' : health?.supabase_configured ? '#f59e0b' : '#64748b',
                  fontWeight: 600,
                }}
              >
                {health?.supabase_connected
                  ? 'Yes (Connected & Verified)'
                  : health?.supabase_configured
                  ? 'No (Tables Missing in Database)'
                  : 'No'}
              </span>
            </div>
            <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid #1c2638' }}>
              <div style={{ color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Diagnostic Status:</div>
              <div
                style={{
                  color: '#94a3b8',
                  background: '#090d16',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #1e293b',
                  fontSize: 11,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {health?.persistence_status ?? 'Operating in-memory fallback.'}
              </div>
            </div>
            {health?.migration_required && (
              <div
                style={{
                  marginTop: 6,
                  padding: '10px 12px',
                  background: '#291b00',
                  border: '1px solid #f59e0b',
                  borderRadius: 6,
                  color: '#fbbf24',
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                <strong>Action Required:</strong> Supabase credentials are valid, but database tables do not exist yet. Run{' '}
                <code style={{ background: '#3b2800', padding: '2px 4px', borderRadius: 4, color: '#fef08a' }}>
                  backend/migrations/001_initial_schema.sql
                </code>{' '}
                in your Supabase SQL Editor to activate PostgreSQL storage.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Educational & Safety Statement */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <ShieldCheck size={18} color="#10b981" />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
            Educational Safety & Isolation Policy
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          ShadowAgent is built strictly as a simulated, mathematical testbed for studying autonomous incident detection
          and corporate sabotage scenarios. All network nodes (firewall, identity servers, databases, and honeypots) are
          represented purely as abstract states inside an internal NetworkX directed graph. The engine does not make
          external socket connections, scan IP ranges, capture real credentials, or interact with physical networks.
        </div>
      </div>
    </div>
  );
};
