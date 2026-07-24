# ProtoPilot Backend

FastAPI + MongoDB + `emergentintegrations` (Gemini 3 Flash) + `PyGithub`.

## Quick start

```bash
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Environment (`.env`)

**Required**
- `MONGO_URL` — e.g. `mongodb://localhost:27017`
- `DB_NAME` — e.g. `protopilot_db`
- `EMERGENT_LLM_KEY` — universal key that unlocks Gemini 3 Flash (already populated)
- `CORS_ORIGINS` — `*` for dev

**Optional (unlock more sources)**
- `GITHUB_TOKEN` + `GITHUB_USERNAME` — powers Ship It + raises GH search rate limit
- `SERPER_API_KEY` — Google search (serper.dev)
- `YOUTUBE_API_KEY` — YouTube Data API
- `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` — Reddit OAuth (script app)

See root README for URLs and step-by-step obtain instructions.

## File map

- `server.py` — All routes under `/api`. Orchestrator uses `asyncio.Queue` for token-level SSE.
- `search.py` — DeepSearch module (ArXiv, GitHub, StackOverflow, Reddit OAuth, Serper, YouTube) with 10-min TTL cache.
- `tests/test_protopilot_backend.py` — pytest regression suite (14 cases).

## Notable design decisions

- **Token-level SSE**: each agent streams via a shared `asyncio.Queue`. The event generator yields `agent_start`, `agent_token`, `agent_done`, and finally `complete` with citations + knowledge graph.
- **Staggered starts**: agents start 0.4s apart to avoid burst rate limits on the LLM key.
- **Graceful fallbacks**: if the LLM returns non-JSON where JSON is expected, hand-crafted defaults are used so the UI never breaks.
- **Cache**: `search.py` has a process-local 10-min TTL cache to spare rate limits when the same idea is analyzed repeatedly.

## Testing

```bash
pytest -v tests/
```
