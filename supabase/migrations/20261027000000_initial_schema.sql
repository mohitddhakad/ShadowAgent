-- =============================================================================
-- ShadowAgent: Initial Schema Migration
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.simulation_runs (
    id           UUID PRIMARY KEY,
    status       TEXT NOT NULL DEFAULT 'completed',
    started_at   TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    metrics      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_started_at 
    ON public.simulation_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS public.network_nodes (
    id                 BIGSERIAL PRIMARY KEY,
    simulation_run_id  UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
    node_key           TEXT NOT NULL,
    label              TEXT NOT NULL,
    node_type          TEXT NOT NULL,
    metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_nodes_run_id 
    ON public.network_nodes (simulation_run_id);

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

CREATE INDEX IF NOT EXISTS idx_simulation_events_run_id 
    ON public.simulation_events (simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_simulation_events_occurred_at 
    ON public.simulation_events (occurred_at ASC);

ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;
