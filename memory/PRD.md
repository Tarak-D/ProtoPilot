# ProtoPilot — PRD

## Original Problem Statement
Build "ProtoPilot" — a Web App (React + FastAPI + MongoDB) AI Research & Innovation Copilot for students. Multi-agent orchestrator (6 agents: Research, Architect, Critic, Code, Citation, Judge) using Gemini 3 Flash via Emergent Universal LLM Key. Features: Home w/ idea input, Live Dashboard with visible Agent Orchestra, 3D Knowledge Graph, Citations, Live Log, Judge Simulator, Failure Museum, Reality Check Score, Time Machine timeline, One-click "Ship It" to real GitHub via user PAT.

Team: **Silence** · College: **Ajeenkya DY Patil** · Team ID: **0A7DD70427DE**

## Architecture
- Frontend: React 19 + TailwindCSS + shadcn/ui + `react-force-graph-3d` + `recharts`.
- Backend: FastAPI + MongoDB (motor) + `emergentintegrations` (Gemini 3 Flash) + `PyGithub`.
- Streaming: SSE for parallel agent orchestration (staggered 0.4s to avoid burst rate limits).

## Personas
- **Student hackathon participant** — needs research + scaffold + repo in minutes.
- **Capstone project team** — needs feasibility scoring + skill-gap curriculum.
- **Judge-facing pitcher** — needs simulated Q&A drills before real pitch.

## Completed (2026-02)
- [x] Home page with terminal-style idea input + example prompts + feature grid.
- [x] Project workspace list + delete + status badges.
- [x] Live Dashboard with 6-agent orchestra, animated states, live log terminal, 3D knowledge graph, citations panel.
- [x] SSE orchestration endpoint dispatches 6 agents in parallel (staggered), persists outputs, builds graph.
- [x] **Token-level SSE streaming**: `agent_start` / `agent_token` / `agent_done` events; frontend accumulates tokens per agent, cards show live growing text with cyan caret while THINKING.
- [x] **Real DeepSearch (6 sources)**: `/app/backend/search.py` — ArXiv (keyless), StackOverflow (keyless, top 4 keywords for recall), GitHub (public + PAT), Reddit (OAuth via `REDDIT_CLIENT_ID`/`SECRET`), Serper Google (via `SERPER_API_KEY`), YouTube Data API (via `YOUTUBE_API_KEY`). Interleaved for source diversity. 10-min TTL cache to spare rate limits. Citations panel color-codes each source (cyan=arxiv, green=github, amber=reddit, red=stackoverflow, white=google, red=youtube).
- [x] Failure Museum (real GH data w/ AI autopsy + source badge) + Reality Check Score (radar + curriculum) + Time Machine (past/now/future).
- [x] Judge Simulator (3 judges × 3 questions each, per-question LLM-scored on clarity/depth/confidence + aggregate scores).
- [x] Ship It flow with real GitHub API (PyGithub) — creates repo, README, .gitignore, folder scaffolds.
- [x] Settings page for GitHub PAT + username + env fallback with comments.
- [x] Retro-futuristic terminal-inspired dark theme with Outfit + JetBrains Mono, cyan/amber/green accents, scanlines, grain.
- [x] Footer: Team Silence · Ajeenkya DY Patil · ID 0A7DD70427DE.

## Backlog (P1)
- Serper / YouTube search integrations for even deeper DeepSearch.
- Voice-first idea input (Whisper) + Hinglish support.
- Export pitch deck as PDF.
- React Native Expo companion.

## Backlog (P2)
- Team Match matchmaking board.
- Public share links for read-only project views.
- Emergent-managed Google Auth for saved workspaces per user.

## Known Limitations
- Free-tier LLM key rate limits may throttle parallel calls; the backend stagger + graceful fallback text prevents hard failures.
- Citations/Museum items are LLM-generated fabrications (labeled as such in copy) — swap to real APIs in P1.
