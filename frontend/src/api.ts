import type {
  NetworkTopology,
  SimulationResult,
  RunSummary,
  SimulationRequest,
  MetricsMetadata,
  HealthStatus,
  RunDetailResponse,
  AnalyticsSummary,
  CompareRequest,
  ComparisonResult,
  RLStatus,
  RLEvaluationBenchmark,
} from './types';

// Configurable base URL: defaults to 127.0.0.1:8000 as specified
const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...options,
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorDetail = errorText;
      try {
        const json = JSON.parse(errorText);
        if (json.detail) {
          errorDetail = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
        }
      } catch {
        // use raw text
      }
      throw new Error(`API Error [${res.status}]: ${errorDetail}`);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error(`Cannot connect to backend at ${BASE_URL}. Ensure FastAPI is running.`);
      }
      throw err;
    }
    throw new Error('An unknown network error occurred.');
  }
}

export const api = {
  getBaseUrl: () => BASE_URL,
  health: () => request<HealthStatus>('/health'),
  getNetwork: () => request<NetworkTopology>('/network'),
  simulate: (req?: SimulationRequest) =>
    request<SimulationResult>('/simulate', {
      method: 'POST',
      body: req ? JSON.stringify(req) : undefined,
    }),
  listRuns: () => request<RunSummary[]>('/runs'),
  getRun: (runId: string) => request<RunDetailResponse>(`/runs/${runId}`),
  getMetrics: () => request<MetricsMetadata>('/metrics'),
  getAnalytics: () => request<AnalyticsSummary>('/analytics'),
  compare: (req?: CompareRequest) =>
    request<ComparisonResult>('/compare', {
      method: 'POST',
      body: req ? JSON.stringify(req) : undefined,
    }),
  getRLStatus: () => request<RLStatus>('/rl/status'),
  trainRL: (req?: { total_timesteps?: number; seed?: number }) =>
    request<{
      status: string;
      algorithm: string;
      total_timesteps: number;
      seed: number;
      saved_path: string;
      evaluation: RLEvaluationBenchmark;
    }>('/rl/train', {
      method: 'POST',
      body: req ? JSON.stringify(req) : undefined,
    }),
  evaluateRL: (nEpisodes: number = 25) =>
    request<RLEvaluationBenchmark>(`/rl/evaluate?n_episodes=${nEpisodes}`, {
      method: 'POST',
    }),
};
