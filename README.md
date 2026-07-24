# ProtoPilot

> **From idea to GitHub commit in 7 minutes.**
> A multi-agent AI Research & Innovation Copilot for students.

**Team Silence** · Ajeenkya DY Patil College of Engineering · Team ID `0A7DD70427DE`
Built for the *Search Less. Solve More.* theme — powered by **iNSIGHTS Layer 2**.

---

## What it does

ProtoPilot takes any project idea (text) and orchestrates **6 AI agents in parallel** — Research, Architect, Critic, Code, Citation, Judge — streaming their thoughts live via SSE. It grounds every claim in **real** ArXiv papers, GitHub repos, and StackOverflow answers (no hallucinated URLs), builds a live 3D knowledge graph, then ships a **real GitHub repository** with README + scaffold + first commit on demand.

### The six "nobody-thought-of-this" features

| # | Feature | What it does |
|---|---------|--------------|
| 1 | **Live Agent Orchestra** | 6 agents stream their outputs token-by-token in parallel — visible, not a black box. |
| 2 | **Failure Museum** | Fetches *real* abandoned/archived GitHub repos on your idea and has AI write an autopsy for each. |
| 3 | **Judge Simulator** | 3 AI judges (Tech, Business, Innovation) grill you with domain questions; each answer scored on Clarity / Depth / Confidence. |
| 4 | **Reality Check Score™** | Feasibility computed for a *student* — your skills, budget (₹), weeks available, team size — plus a 3-week skill-gap curriculum. |
| 5 | **Time Machine** | 5-year past + 2-year future tech landscape timeline to kill the "this is already done" objection. |
| 6 | **One-Click Ship** | Creates a real GitHub repo (via your PAT) with generated README from your agent outputs, folder scaffold, `.gitignore`, and first commit. |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│  React 19 + TailwindCSS + shadcn/ui + react-force-graph-3d        │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐             │
│  │  Home      │  │  Dashboard   │  │  Settings /    │             │
│  │  (idea)    │→ │  6 tabs      │  │  GitHub PAT    │             │
│  └────────────┘  └──────────────┘  └────────────────┘             │
│         │                │                                        │
│         │ POST /api/projects                                      │
│         │ SSE  /api/projects/{id}/orchestrate                     │
│         ▼                ▼                                        │
├───────────────────────────────────────────────────────────────────┤
│  FastAPI (0.0.0.0:8001) — /api prefix                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────┐     │
│  │ Orchestrator  │  │  DeepSearch   │  │  GitHub Ship       │     │
│  │  (SSE token   │  │  ArXiv +      │  │  PyGithub → real   │     │
│  │   streaming)  │  │  GitHub +     │  │  repo + README     │     │
│  │  6 agents in  │  │  StackOverflow│  │  + scaffold        │     │
│  │  parallel     │  │  + Reddit     │  │  + first commit    │     │
│  │  (Gemini 3    │  │  + Serper     │  └────────────────────┘     │
│  │   Flash via   │  │  + YouTube    │                             │
│  │   LLM Key)    │  └───────┬───────┘                             │
│  │               │          │ 10-min TTL cache                    │
│  └───────┬───────┘          │                                     │
│          │                  │                                     │
│          ▼                  ▼                                     │
│  ┌─────────────────────────────────┐                              │
│  │  MongoDB (motor)                │                              │
│  │  · projects (id, idea, outputs, │                              │
│  │    citations, knowledge_graph)  │                              │
│  │  · settings (github PAT)        │                              │
│  └─────────────────────────────────┘                              │
└───────────────────────────────────────────────────────────────────┘
```

**Tech stack**
- **Frontend:** React 19, TailwindCSS, shadcn/ui, `react-force-graph-3d`, `recharts`, `sonner`, `lucide-react`, `axios`
- **Backend:** FastAPI, `motor` (Mongo async), `emergentintegrations` (Gemini 3 Flash), `PyGithub`, `requests`
- **DB:** MongoDB
- **LLM:** Gemini 3 Flash via **Emergent Universal LLM Key** (single key, all three providers)
- **DeepSearch:** ArXiv API (free), GitHub REST (free/PAT), StackExchange API (free), Reddit OAuth, Serper, YouTube Data API

---

## Repo layout

```
/app
├── README.md                        ← this file
├── design_guidelines.json           ← UI design system (terminal/retro-futurist)
├── memory/
│   ├── PRD.md                       ← product spec + backlog
│   └── test_credentials.md
├── backend/
│   ├── README.md
│   ├── server.py                    ← FastAPI routes + orchestrator (SSE token stream)
│   ├── search.py                    ← DeepSearch: ArXiv, GH, SO, Reddit, Serper, YouTube
│   ├── requirements.txt
│   └── .env                         ← LLM key + optional integration keys
├── frontend/
│   ├── README.md
│   ├── package.json
│   ├── src/
│   │   ├── App.js                   ← routes
│   │   ├── index.css                ← theme, fonts, animations
│   │   ├── lib/api.js               ← SSE-aware backend client
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── Dashboard.jsx        ← 6-tab live workspace
│   │   │   └── Settings.jsx
│   │   └── components/
│   │       ├── Navbar.jsx / Footer.jsx
│   │       ├── AgentOrchestra.jsx
│   │       ├── OrchestraView.jsx    ← extracted layout wrapper
│   │       ├── CitationsList.jsx    ← color-coded per source
│   │       ├── KnowledgeGraph.jsx   ← react-force-graph-3d
│   │       ├── JudgeSimulator.jsx
│   │       ├── FailureMuseum.jsx
│   │       ├── RealityCheck.jsx     ← radar + 3-week curriculum
│   │       ├── TimeMachine.jsx
│   │       └── ShipIt.jsx
│   └── .env                         ← REACT_APP_BACKEND_URL
└── test_reports/                    ← automated test outputs
```

---

## Local setup

### Prerequisites
- Node.js 18+ · Yarn · Python 3.11+ · MongoDB running locally (or Atlas URL)

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Configure .env: ensure MONGO_URL, DB_NAME, EMERGENT_LLM_KEY are set (see comments)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend
```bash
cd frontend
yarn install
# Set REACT_APP_BACKEND_URL in .env to your backend URL (e.g. http://localhost:8001)
yarn start
# Opens http://localhost:3000
```

---

## Environment variables

### `backend/.env` (required)
| Variable | Purpose |
|---|---|
| `MONGO_URL` | Mongo connection string (e.g. `mongodb://localhost:27017`) |
| `DB_NAME` | Database name (default: `protopilot_db`) |
| `EMERGENT_LLM_KEY` | Universal Emergent key that unlocks Gemini 3 Flash (pre-populated) |
| `CORS_ORIGINS` | Comma-separated allowed origins (`*` in dev) |

### `backend/.env` (optional — unlock full DeepSearch + Ship It)
| Variable | How to obtain |
|---|---|
| `GITHUB_TOKEN` + `GITHUB_USERNAME` | https://github.com/settings/tokens/new → scope `repo`, 30-day expiration. Powers **Ship It** *and* raises GitHub search rate limits. |
| `SERPER_API_KEY` | https://serper.dev — free 2500 queries/month, no card. Adds Google search results to citations. |
| `YOUTUBE_API_KEY` | https://console.cloud.google.com/apis/library/youtube.googleapis.com — enable & create key. Adds YouTube videos to citations. |
| `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` | https://www.reddit.com/prefs/apps → create a "script" app. Adds Reddit posts to citations. |

You can also paste your GitHub PAT into the app UI at **Settings → GitHub Integration** (stored in Mongo).

### `frontend/.env` (required)
| Variable | Purpose |
|---|---|
| `REACT_APP_BACKEND_URL` | URL where backend is reachable (e.g. `http://localhost:8001` for local dev) |

---

## Demo script (the 3-minute pitch kill-shot)

1. **0:00-0:20** — On stage, mic in hand: *"AI to reduce food waste in college hostels."* Type or say it into the terminal input.
2. **0:20-1:00** — Six agent cards light up in parallel, thoughts streaming live. Knowledge graph forms in 3D. Citations panel fills with real ArXiv papers + GitHub repos.
3. **1:00-1:30** — Open **Failure Museum** tab → 4 *real* abandoned repos with AI autopsies show why they died.
4. **1:30-2:00** — Open **Judge Simulator** → answer one tough question live → Clarity/Depth/Confidence bars update.
5. **2:00-2:30** — Open **Ship It** → click *Ship to GitHub* → console shows 6-step commit ceremony → real repo URL appears. Judges can clone it right there.
6. **2:30-3:00** — Open **Reality Check** → radar chart proves this is buildable in 3 weeks with the team's actual skills + ₹0 budget. Mic drop.

---

## API cheat sheet (all under `/api`)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/` | Health check |
| POST | `/api/projects` | Create project from idea |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/{id}` | Get one project |
| DELETE | `/api/projects/{id}` | Delete project |
| POST | `/api/projects/{id}/orchestrate` | SSE stream: `agent_start` / `agent_token` / `agent_done` / `complete` |
| POST | `/api/projects/{id}/failure-museum` | Real abandoned GitHub repos + AI autopsy |
| POST | `/api/projects/{id}/reality-check` | Radar scores + skill gap curriculum |
| POST | `/api/projects/{id}/time-machine` | Past 5y + future 2y timeline |
| POST | `/api/projects/{id}/judge/questions` | 3×3 tough questions |
| POST | `/api/projects/{id}/judge/score` | Score one answer |
| POST | `/api/projects/{id}/ship` | Create real GitHub repo |
| GET | `/api/settings/github/status` | Is GitHub configured? |
| POST | `/api/settings/github` | Save GitHub PAT + username |

---

## Testing

Backend regression tests live at `backend/tests/test_protopilot_backend.py` (14 pytest cases, ~35s):
```bash
cd backend && pytest -v tests/
```

Frontend has been e2e verified via automated Playwright flow — all 6 tabs render, agents stream, graph builds, citations populate, ship flow works.

---

## Roadmap

**Shipped in MVP**
- ✅ 6-agent SSE orchestrator with token streaming
- ✅ Real DeepSearch (ArXiv + StackOverflow keyless; GitHub with optional PAT; Reddit/Serper/YouTube gated on keys)
- ✅ 3D knowledge graph, radar Reality Check, timeline, judge scoring
- ✅ Real GitHub Ship It via PyGithub

**Backlog (P1)**
- Voice-first Hinglish input (Whisper)
- PDF pitch deck export
- React Native Expo mobile companion
- URL verification icons on citations (HEAD check → green tick)

---

*ProtoPilot · Team Silence · Ajeenkya DY Patil · 0A7DD70427DE · Search Less. Solve More.*
