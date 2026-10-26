# ShadowAgent 🛡️

> **A Multi-Agent Reinforcement Learning Sandbox for Simulating Corporate Sabotage and Autonomous Defense.**
> *Educational and defensive use only. Fictional network graph — no real systems or networks are accessed or affected.*

ShadowAgent is an isolated cybersecurity simulation environment demonstrating multi-agent adversarial interaction. A simulated **Red Team** agent attempts multi-phase corporate sabotage (credential theft, lateral movement, privilege escalation, honeypot triggering, and data exfiltration), while a **Blue Team** agent detects threats, triggers firewall access blocks, terminates compromised sessions, and quarantines affected accounts across a fictional enterprise topology.

---

## ✨ Features

| Feature | Status |
|---|---|
| Modular simulation engine (`engine/`) with deterministic seeding | ✅ |
| Fictional 9-node enterprise network topology (NetworkX) | ✅ |
| 4-phase adversarial simulation: Access → Lateral → Acquisition → Exfiltration | ✅ |
| Configurable seed, detection sensitivity, honeypot toggle, aggression level | ✅ |
| Supabase PostgreSQL persistence with in-memory fallback | ✅ |
| REST API with OpenAPI docs (`/docs`) | ✅ |
| React dashboard — network graph, event timeline, run history | ✅ |
| Security analytics with Recharts visualizations | ✅ |
| Defense comparison: run two configurations side-by-side | ✅ |
| RL Defense Lab — Gymnasium environment + PPO agent (experimental prototype) | ✅ |
| 60 automated pytest tests | ✅ |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              Browser (localhost:5173)                      │
│           React 19 + TypeScript + Vite + Tailwind CSS                     │
│                                                                           │
│  Sidebar Navigation:                                                      │
│  Overview · Network Topology · Simulation Lab · Event Timeline            │
│  Run History · Security Analytics · Defense Comparison · RL Lab · Settings│
│                                                                           │
│  Libraries: @xyflow/react (graph)  Recharts (charts)  Lucide (icons)      │
└──────────────────────────────────┬────────────────────────────────────────┘
                                   │ HTTP / JSON (fetch)
┌──────────────────────────────────▼────────────────────────────────────────┐
│                    FastAPI Backend (localhost:8000)                        │
│                    D:\mini\ShadowAgent\backend\main.py                    │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                engine/  — Simulation Package                         │ │
│  │  network.py   — NetworkX enterprise graph (8 nodes + 1 honeypot)    │ │
│  │  models.py    — Pydantic request/response schemas                   │ │
│  │  simulation.py— Deterministic, seeded multi-phase engine            │ │
│  │                                                                      │ │
│  │  Phases:                                                             │ │
│  │    P1: Initial Access (phishing, credential theft, SIEM anomaly)    │ │
│  │    P2: Lateral Movement (app server, privilege esc, firewall)       │ │
│  │    P3: Target Acquisition (database recon, honeypot tripwire)       │ │
│  │    P4: Exfiltration & Containment (session kill, quarantine)        │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                rl/  — Reinforcement Learning (Experimental)          │ │
│  │  env.py    — CyberDefenseEnv (Gymnasium 1.4.0)                      │ │
│  │  agent.py  — PPO training (Stable-Baselines3) + evaluation           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  persistence/  — SupabaseRepository + InMemoryRepository (fallback)       │
└──────────────────────────────────┬────────────────────────────────────────┘
                                   │ supabase-py
┌──────────────────────────────────▼────────────────────────────────────────┐
│                  Supabase PostgreSQL (optional)                            │
│         simulation_runs · simulation_events · network_nodes               │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.10+ | Tested on 3.13.4 |
| Node.js | 18+ | Frontend toolchain |
| npm | 9+ | Bundled with Node.js |
| Supabase account | Optional | In-memory mode works without it |

---

## Installation (Windows PowerShell)

### 1. Navigate to the Project

```powershell
cd D:\mini\ShadowAgent
```

### 2. Backend — Python Virtual Environment

```powershell
cd backend
# Activate the existing virtual environment
.\.venv\Scripts\Activate.ps1
# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend — Node Modules

```powershell
cd ..\frontend
npm install
```

---

## Environment Variables

### Backend — `backend/.env`

Copy the example file and fill in your Supabase credentials:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env`:

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> **Offline / In-Memory Mode**: If `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` are absent or left as placeholders, the backend runs gracefully in offline mode using an internal in-memory cache. All simulation runs and event lookups function immediately — no database setup required.

> **Security**: `backend/.env` is excluded from Git via `.gitignore`. Never commit this file.

### Frontend — `frontend/.env.local` (optional)

The frontend defaults to `http://127.0.0.1:8000`. To override:

```env
VITE_API_URL=http://localhost:8000
```

---

## Running the Project

### Terminal 1 — Start the Backend

```powershell
cd D:\mini\ShadowAgent\backend
.\.venv\Scripts\uvicorn main:app --reload
```

- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### Terminal 2 — Start the Frontend

```powershell
cd D:\mini\ShadowAgent\frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API version, build info, and route catalog |
| `GET` | `/health` | Health check: Supabase connection, simulation readiness |
| `GET` | `/network` | Fictional enterprise topology (nodes, edges, risk scores) |
| `POST` | `/simulate` | Execute one simulation (seed, sensitivity, honeypot, aggression) |
| `GET` | `/runs` | List recent simulation runs (Supabase or in-memory) |
| `GET` | `/runs/{run_id}` | Full event log for a specific run |
| `GET` | `/metrics` | Metadata on all simulation metrics and config ranges |
| `GET` | `/analytics` | Aggregate statistics across all persisted runs |
| `POST` | `/compare` | Run two configurations and return a side-by-side comparison |
| `GET` | `/rl/status` | Check RL environment and trained model status |
| `POST` | `/rl/train` | Train a PPO agent (experimental — takes ~1–3 min) |
| `POST` | `/rl/evaluate` | Benchmark RL agent vs. rule-based and random defenders |

### Request Schema — `POST /simulate`

```json
{
  "seed": 42,
  "detection_sensitivity": 0.75,
  "honeypot_enabled": true,
  "aggressive_red": false
}
```

All fields are optional. Defaults: random seed, sensitivity=0.75, honeypot=true, aggressive_red=false.

---

## Supabase Database Schema

Run this SQL in the **Supabase SQL Editor** to create all required tables:

```sql
-- 1. Simulation run summaries
CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id           UUID PRIMARY KEY,
  status       TEXT NOT NULL DEFAULT 'completed',
  started_at   TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  metrics      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Network nodes snapshot per simulation run
CREATE TABLE IF NOT EXISTS public.network_nodes (
  id                 BIGSERIAL PRIMARY KEY,
  simulation_run_id  UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  node_key           TEXT NOT NULL,
  label              TEXT NOT NULL,
  node_type          TEXT NOT NULL,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Chronological simulation events per run
CREATE TABLE IF NOT EXISTS public.simulation_events (
  id                 BIGSERIAL PRIMARY KEY,
  simulation_run_id  UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  occurred_at        TIMESTAMPTZ NOT NULL,
  agent              TEXT NOT NULL,   -- 'Red Team' | 'Blue Team'
  severity           TEXT NOT NULL,   -- 'low' | 'medium' | 'high' | 'critical'
  message            TEXT NOT NULL,
  node_key           TEXT NOT NULL,
  action             TEXT NOT NULL,
  details            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Running Tests

The test suite covers API endpoints, simulation determinism, seed repeatability, Supabase persistence payloads, error recovery, analytics, comparison, and the RL environment:

```powershell
cd D:\mini\ShadowAgent\backend
.\.venv\Scripts\pytest tests\ -v
```

Expected: **60 tests pass**.

### Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `tests/test_api.py` | 33 | All REST endpoints, validation, error codes |
| `tests/test_persistence.py` | 13 | InMemoryRepository, Supabase payload shape |
| `tests/test_simulation_workflow.py` | 4 | Determinism, seed repeatability, honeypot isolation |
| `tests/test_analytics_and_compare.py` | 3 | Analytics aggregation, defense comparison |
| `tests/test_rl.py` | 7 | CyberDefenseEnv, action space, episode termination |

---

## Reinforcement Learning Lab (Experimental Prototype)

The RL Defense Lab trains a **PPO agent** (Proximal Policy Optimization via Stable-Baselines3) on the `CyberDefenseEnv` — a Gymnasium-compatible wrapper around the simulation engine.

**Benchmark results (1000 timesteps, seed=42):**

| Defender | Mean Reward | Data Protection Rate |
|----------|-------------|---------------------|
| Rule-Based Defender (deterministic) | ~29 | ~1.0 |
| PPO Agent (1000 steps, undertrained) | ~23 | ~1.0 |
| Random Defender (baseline) | ~10 | ~0.6 |

> ⚠️ **Prototype Caveat**: 1000 training timesteps is far below production-grade RL. The PPO agent matches the rule-based defender on data-protection but requires significantly more training to generalize. The RL lab is labeled EXPERIMENTAL in the UI.

---

## Project Structure

```
D:\mini\ShadowAgent\
├── backend/
│   ├── .env                        ← Not committed (Supabase credentials)
│   ├── .env.example                ← Safe template committed to Git
│   ├── .gitignore
│   ├── main.py                     ← FastAPI application + all routes
│   ├── requirements.txt
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── models.py               ← All Pydantic models
│   │   ├── network.py              ← NetworkX enterprise graph
│   │   └── simulation.py          ← Deterministic multi-phase engine
│   ├── persistence/
│   │   ├── repository.py          ← InMemoryRepository
│   │   └── supabase_client.py     ← SupabaseRepository
│   ├── rl/
│   │   ├── __init__.py
│   │   ├── env.py                  ← CyberDefenseEnv (Gymnasium)
│   │   ├── agent.py               ← PPO training + evaluation helpers
│   │   └── models/                ← Gitignored (trained .zip artifacts)
│   └── tests/
│       ├── test_api.py
│       ├── test_persistence.py
│       ├── test_simulation_workflow.py
│       ├── test_analytics_and_compare.py
│       └── test_rl.py
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 ← Routing, layout
│   │   ├── api.ts                  ← Typed fetch client
│   │   ├── types.ts               ← All TypeScript interfaces
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   └── views/
│   │       ├── OverviewView.tsx
│   │       ├── NetworkView.tsx     ← React Flow interactive topology
│   │       ├── SimulationLabView.tsx
│   │       ├── TimelineView.tsx
│   │       ├── HistoryView.tsx
│   │       ├── AnalyticsView.tsx
│   │       ├── ComparisonView.tsx
│   │       ├── RLDefenseView.tsx
│   │       └── SettingsView.tsx
│   └── package.json
├── .gitignore
└── README.md
```

---

## Known Limitations

- **RL agent is undertrained**: 1000 timesteps is demonstrative only. A production agent would need 100k–1M steps.
- **No real-time streaming**: Simulation results are returned as a single HTTP response. WebSocket/SSE step-by-step playback is a future extension.
- **Single-user, no auth**: The backend has no authentication layer — appropriate for a local demo sandbox, not a production deployment.
- **In-memory runs are lost on restart**: Without Supabase configured, run history resets when the backend process exits.
- **Large JS bundle**: The frontend ships a ~937 KB minified bundle (acceptable for a college project; code-splitting is a future improvement).

---

## Safety & Ethics Statement

> ⚠️ **Educational Simulation Sandbox**: This project models corporate sabotage and incident response strictly as discrete abstract states over a fictional mathematical graph (NetworkX). It does not execute penetration testing tools, scan real networks, forge credentials, drop malware, or communicate with external hosts.
>
> All node names, IP addresses, and organizational structures are entirely fictional and exist only as Python dictionary keys and graph edges. No real vulnerability is exploited or demonstrated.
