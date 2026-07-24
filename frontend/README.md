# ProtoPilot Frontend

React 19 + TailwindCSS + shadcn/ui + `react-force-graph-3d` + `recharts`.

## Quick start

```bash
yarn install
yarn start   # http://localhost:3000
```

## Environment (`.env`)

- `REACT_APP_BACKEND_URL` — e.g. `http://localhost:8001` (must NOT end with `/api`; the client appends it)
- `WDS_SOCKET_PORT` — dev-server socket (leave default)

## Theme

Terminal / retro-futurist. See `/app/design_guidelines.json` for the full system:
- **Fonts**: `Outfit` (heading), `JetBrains Mono` (mono/labels)
- **Palette**: solid `#000000` background · cyan `#00F0FF` · amber `#FFB000` · green `#00FF41` · red `#FF3B30`
- **No purple gradients, no soft shadows.** 1px borders, sharp corners, scanline overlays on Failure Museum + Judge Simulator.

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `pages/Home.jsx` | Terminal-style idea input + example prompts + feature grid |
| `/projects` | `pages/Projects.jsx` | List of past projects with status badges |
| `/project/:id` | `pages/Dashboard.jsx` | 6-tab live workspace (Orchestra / Judge / Museum / Reality / Time / Ship) |
| `/settings` | `pages/Settings.jsx` | GitHub PAT + username entry |

## Component tree

```
App
├── Navbar
├── Home | Projects | Dashboard | Settings
│   └── Dashboard
│       ├── OrchestraView          ← extracted layout
│       │   ├── AgentOrchestra     ← 6 streaming cards
│       │   ├── KnowledgeGraph     ← 3D force graph
│       │   └── CitationsList      ← color-coded per source
│       ├── JudgeSimulator
│       ├── FailureMuseum
│       ├── RealityCheck           ← Recharts radar
│       ├── TimeMachine
│       └── ShipIt
├── Footer                          ← Team Silence branding
└── Toaster (sonner)
```

## SSE client (`lib/api.js`)

The `orchestrate(id, onEvent)` helper uses the Fetch streaming API to read the token-level SSE stream and dispatches parsed events to the caller. This is what powers the live agent orchestra.

## data-testid conventions

Every interactive element has a `data-testid`. See `pages/Dashboard.jsx` and each component for names (e.g. `agent-card-research`, `tab-museum`, `submit-technical-0`, `ship-btn`).

## Notes

Build tool is CRA + `@craco/craco` (see `package.json`). No ejection required.
