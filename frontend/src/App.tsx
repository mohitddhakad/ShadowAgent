import { useState, useEffect, useCallback } from 'react';
import type {
  NetworkTopology,
  SimulationResult,
  RunSummary,
  HealthStatus,
  SimulationRequest,
  ViewTab,
} from './types';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OverviewView } from './views/OverviewView';
import { NetworkView } from './views/NetworkView';
import { SimulationLabView } from './views/SimulationLabView';
import { TimelineView } from './views/TimelineView';
import { HistoryView } from './views/HistoryView';
import { AnalyticsView } from './views/AnalyticsView';
import { ComparisonView } from './views/ComparisonView';
import { RLDefenseView } from './views/RLDefenseView';
import { SettingsView } from './views/SettingsView';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('overview');
  const [topology, setTopology] = useState<NetworkTopology | null>(null);
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Initialize and probe backend
  const fetchData = useCallback(async () => {
    setBackendError(null);
    try {
      const [healthData, netData, runsData] = await Promise.allSettled([
        api.health(),
        api.getNetwork(),
        api.listRuns(),
      ]);

      if (healthData.status === 'fulfilled') {
        setHealth(healthData.value);
      } else {
        setHealth(null);
        setBackendError(healthData.reason?.message || 'Cannot reach FastAPI backend.');
      }

      if (netData.status === 'fulfilled') {
        setTopology(netData.value);
      }

      if (runsData.status === 'fulfilled') {
        setRuns(runsData.value);
      }
    } catch (err: unknown) {
      setBackendError(err instanceof Error ? err.message : 'Backend connection error.');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Execute a new simulation
  const handleRunSimulation = useCallback(
    async (req?: SimulationRequest) => {
      setLoading(true);
      setBackendError(null);
      try {
        const result = await api.simulate(req);
        setLatestResult(result);

        // Refresh runs in background
        api.listRuns().then(setRuns).catch(() => {});
      } catch (err: unknown) {
        setBackendError(err instanceof Error ? err.message : 'Simulation execution failed.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load a historical run from the database or in-memory cache
  const handleLoadRun = useCallback(async (runId: string) => {
    setLoading(true);
    try {
      const data = await api.getRun(runId);
      if (data && data.metrics) {
        // Reconstruct a full SimulationResult from the stored run
        const reconstructed: SimulationResult = {
          run_id: data.run_id,
          status: data.status || 'completed',
          started_at: data.started_at || '',
          completed_at: data.completed_at || '',
          seed: data.metrics ? (data.metrics as unknown as { seed?: number }).seed : 42,
          config: {
            seed: 42,
            detection_sensitivity: 0.8,
            honeypot_enabled: true,
            aggressive_red: false,
          },
          events: data.events || [],
          metrics: data.metrics,
          node_statuses: (data.nodes || []).reduce<Record<string, string>>((acc, n) => {
            acc[n.node_key] = n.metadata?.status || 'clean';
            return acc;
          }, {}),
          persisted: true,
        };
        setLatestResult(reconstructed);
        setCurrentTab('overview');
      }
    } catch (err: unknown) {
      setBackendError(err instanceof Error ? err.message : 'Failed to retrieve run details.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#070a12',
      }}
    >
      {/* 1. Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        eventCount={latestResult?.events.length ?? 0}
        runsCount={runs.length}
      />

      {/* 2. Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Topbar */}
        <Topbar
          currentTab={currentTab}
          health={health}
          loading={loading}
          onQuickSimulate={() => handleRunSimulation()}
          onRefresh={fetchData}
          backendError={backendError}
        />

        {/* Global Connection Warning Banner */}
        {backendError && (
          <div
            style={{
              background: '#2d1216',
              borderBottom: '1px solid #7f1d1d',
              padding: '8px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#f87171',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} />
              <span>{backendError}</span>
            </div>
            <button
              onClick={fetchData}
              style={{
                background: '#121929',
                border: '1px solid #7f1d1d',
                color: '#f8fafc',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RefreshCw size={11} /> Retry Connection
            </button>
          </div>
        )}

        {/* Dynamic View Panel */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {currentTab === 'overview' && (
            <OverviewView
              latestResult={latestResult}
              runs={runs}
              topology={topology}
              onNavigate={setCurrentTab}
              onQuickSimulate={() => handleRunSimulation()}
              loading={loading}
            />
          )}

          {currentTab === 'network' && (
            <NetworkView
              topology={topology}
              latestResult={latestResult}
              loading={loading}
            />
          )}

          {currentTab === 'simulation' && (
            <SimulationLabView
              latestResult={latestResult}
              onRunSimulation={handleRunSimulation}
              loading={loading}
              onNavigate={setCurrentTab}
              error={backendError}
            />
          )}

          {currentTab === 'comparison' && (
            <ComparisonView
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'rl' && (
            <RLDefenseView />
          )}

          {currentTab === 'timeline' && (
            <TimelineView
              events={latestResult?.events ?? []}
              runId={latestResult?.run_id}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              runs={runs}
              onLoadRun={handleLoadRun}
              loading={loading}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView
              latestResult={latestResult}
              runs={runs}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              health={health}
              onRefreshHealth={fetchData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
