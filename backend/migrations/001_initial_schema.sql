-- =============================================================================
-- ShadowAgent: Initial Schema Migration
-- =============================================================================
-- Description:
--   Creates the three core tables required by ShadowAgent:
--     1. public.simulation_runs   - Summary and metrics for each simulation run
--     2. public.network_nodes     - Node state snapshots per simulation run
--     3. public.simulation_events - Chronological security events per run
--
-- Instructions:
--   Copy and paste this entire script into your Supabase Dashboard -> SQL Editor,
--   then click "Run".
-- =============================================================================

-- 1. Simulation Runs Table
CREATE TABLE IF NOT EXISTS public.simulation_runs (
    id           UUID PRIMARY KEY,
    status       TEXT NOT NULL DEFAULT 'completed',
    started_at   TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    metrics      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering runs by started_at
CREATE INDEX IF NOT EXISTS idx_simulation_runs_started_at 
    ON public.simulation_runs (started_at DESC);

-- 2. Network Nodes Table
CREATE TABLE IF NOT EXISTS public.network_nodes (
    id                 BIGSERIAL PRIMARY KEY,
    simulation_run_id  UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
    node_key           TEXT NOT NULL,
    label              TEXT NOT NULL,
    node_type          TEXT NOT NULL,
    metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying nodes by simulation run
CREATE INDEX IF NOT EXISTS idx_network_nodes_run_id 
    ON public.network_nodes (simulation_run_id);

-- 3. Simulation Events Table
CREATE TABLE IF NOT EXISTS public.simulation_events (
    id                 BIGSERIAL PRIMARY KEY,
    simulation_run_id  UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
    occurred_at        TIMESTAMPTZ NOT NULL,
    agent              TEXT NOT NULL,
    severity           TEXT NOT NULL,
    message            TEXT NOT NULL,
    node_key           TEXT NOT NULL,
    action             TEXT NOT NULL,
    details            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for event lookups and timeline ordering
CREATE INDEX IF NOT EXISTS idx_simulation_events_run_id 
    ON public.simulation_events (simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_simulation_events_occurred_at 
    ON public.simulation_events (occurred_at ASC);

-- =============================================================================
-- Row Level Security (RLS)
-- The Supabase Service Role key automatically bypasses RLS.
-- Enabling RLS protects the tables from unauthorized public access.
-- =============================================================================
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;

-- Allow read-only access to authenticated or anonymous users if desired in the future:
-- (Uncomment the lines below if you want frontend client read access without service key)
-- CREATE POLICY "Allow read access to simulation_runs" ON public.simulation_runs FOR SELECT USING (true);
-- CREATE POLICY "Allow read access to network_nodes" ON public.network_nodes FOR SELECT USING (true);
-- CREATE POLICY "Allow read access to simulation_events" ON public.simulation_events FOR SELECT USING (true);
