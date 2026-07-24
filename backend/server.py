"""ProtoPilot backend - multi-agent AI research copilot."""
import os
import uuid
import json
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

from search import arxiv_search, github_search, github_failed_repos, combined_citations

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("protopilot")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="ProtoPilot API")
api = APIRouter(prefix="/api")


# ============== Models ==============
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ProjectCreate(BaseModel):
    idea: str
    title: Optional[str] = None


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    idea: str
    created_at: str = Field(default_factory=now_iso)
    status: str = "draft"  # draft | orchestrating | ready | shipped
    reality_score: Optional[Dict[str, Any]] = None
    github_url: Optional[str] = None
    agent_outputs: Dict[str, str] = Field(default_factory=dict)
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    knowledge_graph: Optional[Dict[str, Any]] = None


class GithubSettings(BaseModel):
    token: str
    username: str


class JudgeAnswer(BaseModel):
    question: str
    answer: str
    judge: str  # technical | business | innovation


# ============== LLM Wrapper ==============
async def llm_generate(system: str, prompt: str, session_id: str, agent: str = "generic") -> str:
    """Non-streaming helper using Gemini 3 Flash (cheapest)."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system,
        ).with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=prompt))
        return resp if isinstance(resp, str) else str(resp)
    except Exception as e:
        logger.exception("LLM error for %s", agent)
        return f"[{agent} agent temporarily offline: {str(e)[:120]}]"


async def llm_stream(system: str, prompt: str, session_id: str):
    """Stream tokens from LLM."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system,
        ).with_model("gemini", "gemini-3-flash-preview")
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                yield ev.content
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        logger.exception("LLM stream error")
        yield f"\n[error: {str(e)[:120]}]"


# ============== Agent prompts ==============
AGENT_SYSTEMS = {
    "research": "You are the Research Agent for ProtoPilot. Given a project idea, produce a concise research brief (~180 words) with: problem statement, market size (with rough numbers), 3 comparable existing projects, and 3 recent (2024-2026) developments. Be specific and use bullet points where helpful.",
    "architect": "You are the Architect Agent. Given the idea, produce a technical architecture (~180 words): tech stack (frontend/backend/DB/APIs), 5-step data flow, and key modules. Be pragmatic for a student team.",
    "critic": "You are the Critic Agent. Ruthlessly critique the idea (~150 words): top 3 risks, top 3 hidden costs, and 2 things that will fail in production. Be direct and specific.",
    "code": "You are the Code Agent. Output ONLY a plausible folder tree and a minimal README.md heading list (~150 words) for scaffolding this project. Format: ``` codeblocks. No prose.",
    "citation": "You are the Citation Agent. You will receive REAL search results from ArXiv and GitHub. For each source, write ONE line explaining its relevance to the idea (format: '- [source] title — one-sentence relevance'). Do NOT invent URLs; use exactly the ones provided.",
    "judge": "You are the Judge Preparer. Generate 5 hackathon-judge-style tough questions about the idea. Return as a numbered list.",
}


# ============== Endpoints ==============
@api.get("/")
async def root():
    return {"service": "ProtoPilot", "status": "online"}


@api.post("/projects", response_model=Project)
async def create_project(inp: ProjectCreate):
    title = inp.title or (inp.idea[:60] + ("…" if len(inp.idea) > 60 else ""))
    proj = Project(title=title, idea=inp.idea)
    doc = proj.model_dump()
    await db.projects.insert_one(doc)
    return proj


@api.get("/projects", response_model=List[Project])
async def list_projects():
    docs = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Project(**d) for d in docs]


@api.get("/projects/{pid}", response_model=Project)
async def get_project(pid: str):
    doc = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    return Project(**doc)


@api.delete("/projects/{pid}")
async def delete_project(pid: str):
    await db.projects.delete_one({"id": pid})
    return {"ok": True}


# ---- Orchestration: run all 6 agents in parallel with TOKEN-level streaming ----
async def _stream_agent(pid: str, agent: str, idea: str, queue: asyncio.Queue, delay: float):
    """Stream tokens from one agent into a shared queue."""
    if delay > 0:
        await asyncio.sleep(delay)
    await queue.put({"type": "agent_start", "agent": agent})
    system = AGENT_SYSTEMS[agent]
    prompt = f"IDEA: {idea}"

    # Citation agent: replace prompt with REAL fetched sources
    real_sources: List[Dict[str, Any]] = []
    if agent == "citation":
        tok, _ = await _get_github_creds()
        serper_key = os.environ.get("SERPER_API_KEY") or ""
        yt_key = os.environ.get("YOUTUBE_API_KEY") or ""
        rd_cid = os.environ.get("REDDIT_CLIENT_ID") or ""
        rd_sec = os.environ.get("REDDIT_CLIENT_SECRET") or ""
        real_sources = await combined_citations(
            idea, token=tok or None,
            serper_key=serper_key or None, youtube_key=yt_key or None,
            reddit_cid=rd_cid or None, reddit_secret=rd_sec or None,
        )
        if real_sources:
            src_text = "\n".join([f"- [{s['source']}] {s['title']} :: {s['url']} :: {s.get('snippet','')}" for s in real_sources])
            prompt = f"IDEA: {idea}\n\nREAL SOURCES (use these exact URLs, do not invent):\n{src_text}"

    full = ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{pid}-{agent}",
            system_message=system,
        ).with_model("gemini", "gemini-3-flash-preview")
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                full += ev.content
                await queue.put({"type": "agent_token", "agent": agent, "token": ev.content})
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        logger.exception("stream error for %s", agent)
        err = f"[{agent} agent offline: {str(e)[:120]}]"
        full = full or err
        await queue.put({"type": "agent_token", "agent": agent, "token": err})

    # Persist
    await db.projects.update_one({"id": pid}, {"$set": {f"agent_outputs.{agent}": full}})
    payload: Dict[str, Any] = {"type": "agent_done", "agent": agent, "output": full}
    if agent == "citation":
        payload["real_sources"] = real_sources
    await queue.put(payload)


@api.post("/projects/{pid}/orchestrate")
async def orchestrate(pid: str):
    """Run all 6 agents in parallel. Streams token-level SSE events."""
    proj_doc = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not proj_doc:
        raise HTTPException(404, "Project not found")
    idea = proj_doc["idea"]

    async def event_gen():
        await db.projects.update_one({"id": pid}, {"$set": {"status": "orchestrating"}})
        yield f"data: {json.dumps({'type':'start','agents':list(AGENT_SYSTEMS.keys())})}\n\n"

        queue: asyncio.Queue = asyncio.Queue()
        tasks = []
        for idx, a in enumerate(AGENT_SYSTEMS.keys()):
            tasks.append(asyncio.create_task(_stream_agent(pid, a, idea, queue, idx * 0.4)))

        completed = 0
        total = len(tasks)
        citations_final: List[Dict[str, Any]] = []
        while completed < total:
            ev = await queue.get()
            if ev.get("type") == "agent_done":
                completed += 1
                if ev.get("agent") == "citation" and ev.get("real_sources"):
                    citations_final = ev["real_sources"]
            yield f"data: {json.dumps(ev)}\n\n"

        # Ensure all tasks finished
        await asyncio.gather(*tasks, return_exceptions=True)

        # Build knowledge graph
        graph = await _build_graph(pid, idea)
        # Fallback if citation agent didn't yield real sources
        if not citations_final:
            tok, _ = await _get_github_creds()
            serper_key = os.environ.get("SERPER_API_KEY") or ""
            yt_key = os.environ.get("YOUTUBE_API_KEY") or ""
            rd_cid = os.environ.get("REDDIT_CLIENT_ID") or ""
            rd_sec = os.environ.get("REDDIT_CLIENT_SECRET") or ""
            citations_final = await combined_citations(
                idea, token=tok or None,
                serper_key=serper_key or None, youtube_key=yt_key or None,
                reddit_cid=rd_cid or None, reddit_secret=rd_sec or None,
            )
        await db.projects.update_one(
            {"id": pid},
            {"$set": {"status": "ready", "citations": citations_final, "knowledge_graph": graph}}
        )
        yield f"data: {json.dumps({'type':'complete','citations':citations_final,'graph':graph})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


async def _build_graph(pid: str, idea: str) -> Dict[str, Any]:
    system = (
        "You are a Knowledge Graph builder. Given a project idea, return ONLY valid JSON of the form "
        "{\"nodes\":[{\"id\":\"root\",\"label\":\"...\",\"group\":\"core\"}, ...], \"links\":[{\"source\":\"root\",\"target\":\"...\"}, ...]}. "
        "Include 10-14 nodes: 1 root (the idea), 3 tech concepts (group 'tech'), 3 domain concepts ('domain'), 3 methods ('method'), 2-4 tools ('tool'). "
        "All nodes must have unique short ids. All links must reference existing node ids."
    )
    raw = await llm_generate(system, f"IDEA: {idea}", session_id=f"{pid}-graph", agent="graph")
    try:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end >= 0:
            return json.loads(raw[start:end+1])
    except Exception:
        pass
    # Fallback
    return {
        "nodes": [
            {"id": "root", "label": idea[:30], "group": "core"},
            {"id": "ai", "label": "AI/ML", "group": "tech"},
            {"id": "web", "label": "Web App", "group": "tech"},
            {"id": "users", "label": "Users", "group": "domain"},
        ],
        "links": [
            {"source": "root", "target": "ai"},
            {"source": "root", "target": "web"},
            {"source": "root", "target": "users"},
        ],
    }


# ---- Failure Museum (REAL GitHub data + LLM autopsy) ----
@api.post("/projects/{pid}/failure-museum")
async def failure_museum(pid: str):
    doc = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    idea = doc["idea"]

    # Fetch real abandoned/archived GitHub repos
    tok, _ = await _get_github_creds()
    real_repos = await github_failed_repos(idea, max_items=4, token=tok or None)

    # If none found, broaden search using the first few words
    if not real_repos:
        short = " ".join(idea.split()[:3])
        real_repos = await github_failed_repos(short, max_items=4, token=tok or None)

    if not real_repos:
        # Fallback: synthesize plausible ones via LLM (labeled clearly)
        system = (
            "You are the Failure Museum curator. GitHub search was unavailable — generate 4 REALISTIC hypothetical "
            "examples of abandoned projects on this idea. Return ONLY JSON array: "
            "[{\"name\":\"user/repo\", \"stars\":<int>, \"last_commit\":\"YYYY-MM\", "
            "\"cause_of_death\":\"...\", \"autopsy\":\"2 sentence diagnosis\"}]."
        )
        raw = await llm_generate(system, f"IDEA: {idea}", session_id=f"{pid}-museum-fb", agent="museum")
        items = []
        try:
            s = raw.find("["); e = raw.rfind("]")
            if s >= 0 and e >= 0:
                items = json.loads(raw[s:e+1])
        except Exception:
            items = []
        if not items:
            items = [{
                "name": "hypothetical/project",
                "stars": 24,
                "last_commit": "2023-06",
                "cause_of_death": "Scope creep",
                "autopsy": "Solo maintainer over-committed. Configure a GitHub PAT in Settings to see REAL abandoned repos.",
            }]
        # Mark items with url empty to signal synthetic
        for it in items:
            it.setdefault("url", "")
        return {"projects": items, "source": "synthetic"}

    # Use LLM to write autopsy for each REAL repo
    async def _autopsy(r: Dict[str, Any]) -> Dict[str, Any]:
        system = (
            "You are a post-mortem analyst. Given a REAL abandoned GitHub repo, write a sharp 2-sentence "
            "autopsy explaining the most likely reason the project died and one lesson for a new team. "
            "Return ONLY JSON: {\"cause_of_death\":\"...\",\"autopsy\":\"...\"}."
        )
        prompt = (
            f"IDEA CONTEXT: {idea}\n"
            f"REPO: {r['name']}\n"
            f"STARS: {r['stars']} · LAST COMMIT: {r['last_commit']} · OPEN ISSUES: {r['open_issues']} · ARCHIVED: {r['archived']}\n"
            f"DESCRIPTION: {r['description']}"
        )
        raw = await llm_generate(system, prompt, session_id=f"{pid}-museum-{r['name']}", agent="museum")
        cause, autopsy = "Abandoned", "Low commit activity and unresolved issues suggest the maintainer moved on."
        try:
            s = raw.find("{"); e = raw.rfind("}")
            if s >= 0 and e >= 0:
                j = json.loads(raw[s:e+1])
                cause = j.get("cause_of_death", cause)
                autopsy = j.get("autopsy", autopsy)
        except Exception:
            pass
        return {
            "name": r["name"],
            "url": r["url"],
            "stars": r["stars"],
            "last_commit": r["last_commit"],
            "cause_of_death": cause,
            "autopsy": autopsy,
        }

    items = await asyncio.gather(*[_autopsy(r) for r in real_repos])
    return {"projects": list(items), "source": "real"}


# ---- Reality Check ----
class RealityInput(BaseModel):
    skills: List[str] = []
    budget_inr: int = 0
    weeks_available: int = 4
    team_size: int = 2


@api.post("/projects/{pid}/reality-check")
async def reality_check(pid: str, inp: RealityInput):
    doc = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    system = (
        "You are the Reality Check Score engine. Given an idea and student context, return ONLY JSON: "
        "{\"skills\":<0-100>, \"budget\":<0-100>, \"time\":<0-100>, \"team\":<0-100>, \"scope\":<0-100>, "
        "\"overall\":<0-100>, \"required_skills\":[\"skill1\",...5-7], \"missing_skills\":[...], "
        "\"curriculum\":[{\"week\":1,\"focus\":\"...\",\"resource\":\"...\"},{\"week\":2,...},{\"week\":3,...}], "
        "\"teammates_needed\":[\"role1\",\"role2\"]}. Score fairly for a student with given constraints."
    )
    prompt = f"IDEA: {doc['idea']}\nSTUDENT: skills={inp.skills}, budget=₹{inp.budget_inr}, weeks={inp.weeks_available}, team_size={inp.team_size}"
    raw = await llm_generate(system, prompt, session_id=f"{pid}-reality", agent="reality")
    result: Dict[str, Any] = {}
    try:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end >= 0:
            result = json.loads(raw[start:end+1])
    except Exception:
        result = {}
    if not result:
        result = {"skills": 60, "budget": 80, "time": 70, "team": 65, "scope": 55, "overall": 66,
                  "required_skills": ["Python", "React", "MongoDB"], "missing_skills": [],
                  "curriculum": [], "teammates_needed": ["Full-stack dev", "Designer"]}
    await db.projects.update_one({"id": pid}, {"$set": {"reality_score": result}})
    return result


# ---- Time Machine ----
@api.post("/projects/{pid}/time-machine")
async def time_machine(pid: str):
    doc = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    system = (
        "You are the Time Machine. Given an idea, return ONLY JSON of tech landscape: "
        "{\"past\":[{\"year\":2021,\"event\":\"...\"},...5 items 2021-2025], "
        "\"future\":[{\"year\":2026,\"prediction\":\"...\"},{\"year\":2027,\"prediction\":\"...\"}], "
        "\"trend\":\"one-line summary of direction\"}."
    )
    raw = await llm_generate(system, f"IDEA: {doc['idea']}", session_id=f"{pid}-time", agent="time")
    result: Dict[str, Any] = {}
    try:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end >= 0:
            result = json.loads(raw[start:end+1])
    except Exception:
        result = {}
    if not result:
        result = {
            "past": [{"year": y, "event": f"Milestone in {y}"} for y in [2021,2022,2023,2024,2025]],
            "future": [{"year": 2026, "prediction": "Rapid adoption"}, {"year": 2027, "prediction": "Mainstream integration"}],
            "trend": "Growing rapidly",
        }
    return result


# ---- Judge Simulator ----
@api.post("/projects/{pid}/judge/questions")
async def judge_questions(pid: str):
    doc = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    system = (
        "You are three hackathon judges. Return ONLY JSON: "
        "{\"technical\":[3 tough tech questions], \"business\":[3 tough biz/market questions], "
        "\"innovation\":[3 tough novelty/impact questions]}. Each question ≤ 20 words."
    )
    raw = await llm_generate(system, f"IDEA: {doc['idea']}", session_id=f"{pid}-judgeQ", agent="judgeQ")
    result = {}
    try:
        start = raw.find("{"); end = raw.rfind("}")
        if start >= 0 and end >= 0:
            result = json.loads(raw[start:end+1])
    except Exception:
        pass
    if not result:
        result = {
            "technical": ["How do you handle 10k concurrent users?", "What is your latency budget?", "How do you prevent hallucinations?"],
            "business": ["What's your unit economics?", "Who pays and how much?", "What's your go-to-market?"],
            "innovation": ["Why hasn't this been built already?", "What's your defensible moat?", "How is this 10x better?"],
        }
    return result


@api.post("/projects/{pid}/judge/score")
async def judge_score(pid: str, ans: JudgeAnswer):
    system = (
        "You are a strict hackathon judge scoring an answer. Return ONLY JSON: "
        "{\"clarity\":<0-10>, \"depth\":<0-10>, \"confidence\":<0-10>, \"feedback\":\"one sentence sharp feedback\"}."
    )
    prompt = f"JUDGE_TYPE: {ans.judge}\nQUESTION: {ans.question}\nANSWER: {ans.answer}"
    raw = await llm_generate(system, prompt, session_id=f"{pid}-score", agent="score")
    result = {}
    try:
        start = raw.find("{"); end = raw.rfind("}")
        if start >= 0 and end >= 0:
            result = json.loads(raw[start:end+1])
    except Exception:
        pass
    if not result:
        result = {"clarity": 6, "depth": 5, "confidence": 6, "feedback": "Add specifics and a concrete example."}
    return result


# ---- Ship It (GitHub) ----
@api.post("/settings/github")
async def save_github(s: GithubSettings):
    await db.settings.update_one(
        {"_id": "github"},
        {"$set": {"token": s.token, "username": s.username, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.get("/settings/github/status")
async def github_status():
    # Check .env first, then db
    tok = os.environ.get("GITHUB_TOKEN") or ""
    user = os.environ.get("GITHUB_USERNAME") or ""
    if not tok:
        doc = await db.settings.find_one({"_id": "github"})
        if doc:
            tok = doc.get("token", "")
            user = doc.get("username", "")
    return {"configured": bool(tok and user), "username": user}


async def _get_github_creds():
    tok = os.environ.get("GITHUB_TOKEN") or ""
    user = os.environ.get("GITHUB_USERNAME") or ""
    if not tok:
        doc = await db.settings.find_one({"_id": "github"})
        if doc:
            tok = doc.get("token", "")
            user = doc.get("username", "")
    return tok, user


def _slug(name: str) -> str:
    import re
    s = re.sub(r"[^a-zA-Z0-9\-_ ]", "", name).strip().lower()
    s = re.sub(r"\s+", "-", s)
    return s[:60] or f"protopilot-{uuid.uuid4().hex[:6]}"


@api.post("/projects/{pid}/ship")
async def ship_it(pid: str):
    doc = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    tok, user = await _get_github_creds()
    if not tok or not user:
        raise HTTPException(400, "GitHub not configured. Set GITHUB_TOKEN + GITHUB_USERNAME in Settings.")

    try:
        from github import Github, GithubException, InputGitTreeElement
    except Exception as e:
        raise HTTPException(500, f"PyGithub not installed: {e}")

    idea = doc["idea"]
    title = doc["title"]
    slug = _slug(title) + "-" + uuid.uuid4().hex[:4]

    def _do_ship():
        gh = Github(tok)
        u = gh.get_user()
        repo = u.create_repo(
            name=slug,
            description=f"ProtoPilot: {title[:100]}",
            private=False,
            auto_init=True,
        )
        # Build files
        code_scaffold = doc.get("agent_outputs", {}).get("code", "")
        architect = doc.get("agent_outputs", {}).get("architect", "")
        research = doc.get("agent_outputs", {}).get("research", "")
        readme = f"""# {title}

> Auto-generated by **ProtoPilot** — from idea to GitHub commit in minutes.

## Idea
{idea}

## Research Brief
{research}

## Architecture
{architect}

## Scaffold
{code_scaffold}

---
Built with ProtoPilot · Team Silence · Ajeenkya DY Patil · ID 0A7DD70427DE
"""
        # Update README
        readme_file = repo.get_contents("README.md")
        repo.update_file(readme_file.path, "ProtoPilot: initial README", readme, readme_file.sha)
        # Add .gitignore + starter files
        repo.create_file(".gitignore", "add gitignore", "node_modules\n.env\n__pycache__\n*.pyc\ndist\nbuild\n")
        repo.create_file("backend/README.md", "backend scaffold", "# Backend\n\nFastAPI service.\n")
        repo.create_file("frontend/README.md", "frontend scaffold", "# Frontend\n\nReact app.\n")
        repo.create_file("docs/PROTOPILOT.md", "protopilot metadata",
                         f"# ProtoPilot Metadata\n\n- Project ID: {pid}\n- Title: {title}\n- Generated: {now_iso()}\n")
        return repo.html_url

    url: Optional[str] = None
    try:
        url = await asyncio.to_thread(_do_ship)
    except Exception as e:
        raise HTTPException(500, f"GitHub error: {e}")

    if not url:
        raise HTTPException(500, "GitHub ship failed: no URL returned")

    await db.projects.update_one({"id": pid}, {"$set": {"github_url": url, "status": "shipped"}})
    return {"url": url}


# ============== App wiring ==============
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
