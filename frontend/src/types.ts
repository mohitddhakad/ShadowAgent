// ── API response types (mirror backend Pydantic models) ──────────────────────

export interface NetworkNode {
  id: string;
  label: string;
  type: 'user' | 'server' | 'database' | 'honeypot' | 'firewall' | 'siem';
  x: number;
  y: number;
  description?: string;
  status?: 'clean' | 'suspicious' | 'compromised' | 'isolated' | 'honeypot_hit';
  risk_score?: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface SimulationEvent {
  id: string;
  timestamp: string;
  occurred_at?: string;
  agent: 'Red Team' | 'Blue Team';
  action: string;
  node_id: string;
  node_key?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  success: boolean;
  phase?: number;
  details?: Record<string, unknown>;
}

export interface SimulationMetrics {
  total_events: number;
  threats_generated?: number;
  threats_detected: number;
  attacks_blocked: number;
  data_protected: boolean;
  detection_rate: number;
  response_time_ms: number;
  false_positives?: number;
  successful_containment?: number;
  compromised_assets?: number;
  simulation_duration_ms?: number;
}

export interface SimulationConfig {
  seed: number;
  detection_sensitivity: number;
  honeypot_enabled: boolean;
  aggressive_red: boolean;
}

export interface SimulationResult {
  run_id: string;
  status: string;
  started_at: string;
  completed_at: string;
  seed?: number;
  config?: SimulationConfig;
  events: SimulationEvent[];
  metrics: SimulationMetrics;
  node_statuses?: Record<string, string>;
  persisted?: boolean;
  persistence_backend?: string;
  persistence_message?: string;
}

export interface RunSummary {
  id?: string;
  run_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  seed?: number;
  total_events: number;
  threats_detected: number;
  attacks_blocked: number;
  detection_rate: number;
  compromised_assets?: number;
  data_protected?: boolean;
  metrics?: Record<string, unknown>;
}

export interface SimulationRequest {
  seed?: number;
  detection_sensitivity?: number;
  honeypot_enabled?: boolean;
  aggressive_red?: boolean;
}

export interface MetricsMetadata {
  metric_definitions: Record<string, string>;
  config_parameters: Record<string, string>;
}

export interface HealthStatus {
  status: string;
  project: string;
  version: string;
  supabase_configured?: boolean;
  supabase_connected?: boolean;
  persistence_backend?: 'supabase' | 'in_memory';
  persistence_status?: string;
  simulation?: string;
  storage_adapter?: string;
  migration_required?: boolean;
}

export interface RunNodeSnapshot {
  id?: string | number;
  simulation_run_id: string;
  node_key: string;
  label: string;
  node_type: string;
  metadata: {
    status?: string;
    risk_score?: number;
    x?: number;
    y?: number;
    description?: string;
  };
}

export interface RunDetailResponse {
  run?: {
    id: string;
    status: string;
    started_at: string;
    completed_at?: string;
    metrics?: SimulationMetrics;
  };
  run_id: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  metrics?: SimulationMetrics;
  nodes?: RunNodeSnapshot[];
  events?: SimulationEvent[];
}

export type ViewTab =
  | 'overview'
  | 'network'
  | 'simulation'
  | 'comparison'
  | 'rl'
  | 'timeline'
  | 'history'
  | 'analytics'
  | 'settings';

export interface ComparisonMetricDiff {
  detection_rate_delta: number;
  containment_success_delta: number;
  compromised_assets_delta: number;
  false_positives_delta: number;
  events_generated_delta: number;
  runtime_ms_delta: number;
}

export interface ComparisonResult {
  seed: number;
  run_a: SimulationResult;
  run_b: SimulationResult;
  diff: ComparisonMetricDiff;
  analysis: string;
  metric_definitions: Record<string, string>;
  limitations: string[];
}

export interface CompareRequest {
  seed?: number;
  config_a: SimulationRequest;
  config_b: SimulationRequest;
}

export interface RunTrendPoint {
  run_index: number;
  run_id: string;
  seed?: number;
  detection_rate: number;
  containment_rate: number;
  threats_detected: number;
  threats_generated: number;
  false_positives: number;
  compromised_assets: number;
  duration_ms: number;
}

export interface AnalyticsSummary {
  total_runs: number;
  total_threats_generated: number;
  total_threats_detected: number;
  overall_detection_rate: number;
  total_attacks_blocked: number;
  total_containment_success: number;
  overall_containment_rate: number;
  total_false_positives: number;
  avg_false_positives_per_run: number;
  total_compromised_assets: number;
  avg_compromised_assets_per_run: number;
  avg_duration_ms: number;
  avg_response_time_ms: number;
  severity_distribution: Record<string, number>;
  agent_distribution: Record<string, number>;
  run_trends: RunTrendPoint[];
  has_data: boolean;
}

export interface AgentBenchmarkMetrics {
  episodes_evaluated: number;
  mean_reward: number;
  std_reward: number;
  data_protection_rate: number;
  avg_attacks_blocked: number;
  avg_false_isolations: number;
}

export interface RLStatus {
  status: string;
  framework: string;
  algorithm: string;
  model_trained: boolean;
  model_details?: {
    file: string;
    size_kb: number;
    last_modified: string;
  };
  environment_spec: {
    observation_space: string;
    observation_description: string[];
    action_space: string;
    actions: Record<string, string>;
    reward_function: Record<string, string>;
  };
  limitations: string[];
}

export interface RLEvaluationBenchmark {
  rule_based_baseline?: AgentBenchmarkMetrics;
  random_baseline?: AgentBenchmarkMetrics;
  rl_trained_agent?: AgentBenchmarkMetrics | null;
  rl_model_loaded?: boolean;
  rl_error?: string;
}

