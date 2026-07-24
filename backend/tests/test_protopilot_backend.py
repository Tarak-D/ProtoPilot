"""
ProtoPilot backend regression tests - Iteration 2.
Tests all 11 endpoints listed in the review request.
"""
import os
import json
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://idea-to-ship-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Fallback: read from frontend/.env if env var not set
if "preview.emergentagent.com" not in BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    API = f"{BASE_URL}/api"
    except Exception:
        pass


SAMPLE_IDEA = "AI to reduce food waste in college hostels"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def project_id(session):
    """Create a project once and share across tests."""
    r = session.post(f"{API}/projects", json={"idea": SAMPLE_IDEA})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data
    assert data["idea"] == SAMPLE_IDEA
    return data["id"]


# ========== Basic endpoints ==========
class TestBasics:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        j = r.json()
        assert j.get("service") == "ProtoPilot"
        assert j.get("status") == "online"

    def test_list_projects(self, session, project_id):
        r = session.get(f"{API}/projects")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert any(p["id"] == project_id for p in arr)

    def test_get_project(self, session, project_id):
        r = session.get(f"{API}/projects/{project_id}")
        assert r.status_code == 200
        j = r.json()
        assert j["id"] == project_id
        assert j["idea"] == SAMPLE_IDEA

    def test_get_project_404(self, session):
        r = session.get(f"{API}/projects/nonexistent-{int(time.time())}")
        assert r.status_code == 404


# ========== Orchestrate (SSE) ==========
class TestOrchestrate:
    def test_orchestrate_sse_streaming(self, session, project_id):
        """Verify SSE emits agent_start, agent_token, agent_done, complete."""
        r = session.post(f"{API}/projects/{project_id}/orchestrate", stream=True, timeout=180)
        assert r.status_code == 200
        assert "text/event-stream" in r.headers.get("content-type", "")

        events_by_type = {}
        tokens_by_agent = {}
        done_agents = set()
        complete_event = None
        agent_start_seen = set()

        for raw_line in r.iter_lines(decode_unicode=True):
            if not raw_line or not raw_line.startswith("data:"):
                continue
            try:
                ev = json.loads(raw_line[5:].strip())
            except Exception:
                continue
            t = ev.get("type", "")
            events_by_type[t] = events_by_type.get(t, 0) + 1
            if t == "agent_start":
                agent_start_seen.add(ev.get("agent"))
            elif t == "agent_token":
                a = ev.get("agent")
                tokens_by_agent[a] = tokens_by_agent.get(a, 0) + 1
            elif t == "agent_done":
                done_agents.add(ev.get("agent"))
            elif t == "complete":
                complete_event = ev
                break

        # Assertions
        assert events_by_type.get("start", 0) >= 1, "missing 'start' event"
        assert len(agent_start_seen) == 6, f"expected 6 agents started, got {agent_start_seen}"
        assert len(done_agents) == 6, f"expected 6 agent_done, got {done_agents}"
        # token-level streaming
        assert sum(tokens_by_agent.values()) > 0, "no agent_token events emitted"
        # At least one agent had tokens before done (token count > 0 for that agent)
        agents_with_tokens = [a for a, c in tokens_by_agent.items() if c > 0]
        assert len(agents_with_tokens) >= 1, "no agent produced tokens"
        assert complete_event is not None, "missing 'complete' event"
        assert "citations" in complete_event
        assert "graph" in complete_event

        # Store citations for next test via patching
        TestOrchestrate.citations = complete_event.get("citations", [])
        TestOrchestrate.graph = complete_event.get("graph", {})

    def test_citations_have_real_urls(self, session, project_id):
        """After orchestrate, citations must include at least arxiv w/ real http URLs."""
        cites = getattr(TestOrchestrate, "citations", None)
        if cites is None:
            pytest.skip("orchestrate SSE test did not run")
        assert isinstance(cites, list)
        assert len(cites) >= 1, "no citations returned"
        sources = {c.get("source") for c in cites}
        # Should include at least arxiv (keyless)
        assert "arxiv" in sources or "stackoverflow" in sources or "github" in sources, f"expected arxiv/so/github in sources, got {sources}"
        # All URLs must start with http
        for c in cites:
            u = c.get("url", "")
            assert u.startswith("http://") or u.startswith("https://"), f"bad citation URL: {u}"


# ========== Failure Museum ==========
class TestFailureMuseum:
    def test_failure_museum(self, session, project_id):
        r = session.post(f"{API}/projects/{project_id}/failure-museum", timeout=120)
        assert r.status_code == 200
        j = r.json()
        assert "projects" in j
        assert "source" in j
        assert j["source"] in ("real", "synthetic")
        assert isinstance(j["projects"], list)
        assert len(j["projects"]) >= 1
        for p in j["projects"]:
            assert "name" in p
            assert "cause_of_death" in p or "autopsy" in p


# ========== Reality Check ==========
class TestRealityCheck:
    def test_reality_check(self, session, project_id):
        payload = {"skills": ["python", "react"], "budget_inr": 5000, "weeks_available": 4, "team_size": 2}
        r = session.post(f"{API}/projects/{project_id}/reality-check", json=payload, timeout=90)
        assert r.status_code == 200
        j = r.json()
        assert "overall" in j
        assert isinstance(j["overall"], (int, float))


# ========== Time Machine ==========
class TestTimeMachine:
    def test_time_machine(self, session, project_id):
        r = session.post(f"{API}/projects/{project_id}/time-machine", timeout=90)
        assert r.status_code == 200
        j = r.json()
        assert "past" in j
        assert "future" in j


# ========== Judge Simulator ==========
class TestJudge:
    def test_judge_questions(self, session, project_id):
        r = session.post(f"{API}/projects/{project_id}/judge/questions", timeout=90)
        assert r.status_code == 200
        j = r.json()
        assert "technical" in j
        assert "business" in j
        assert "innovation" in j
        assert isinstance(j["technical"], list) and len(j["technical"]) >= 1

    def test_judge_score(self, session, project_id):
        payload = {"question": "How will you scale to 10k users?", "answer": "We'll shard MongoDB and cache with Redis.", "judge": "technical"}
        r = session.post(f"{API}/projects/{project_id}/judge/score", json=payload, timeout=90)
        assert r.status_code == 200
        j = r.json()
        assert "clarity" in j
        assert "depth" in j
        assert "confidence" in j


# ========== Settings & Ship ==========
class TestShip:
    def test_github_status(self, session):
        r = session.get(f"{API}/settings/github/status")
        assert r.status_code == 200
        j = r.json()
        assert "configured" in j
        assert j["configured"] is False

    def test_ship_without_credentials(self, session, project_id):
        r = session.post(f"{API}/projects/{project_id}/ship")
        assert r.status_code == 400, f"expected 400 without creds, got {r.status_code}: {r.text}"
        assert "GitHub" in r.text or "github" in r.text.lower()


# ========== Delete (cleanup, runs last) ==========
class TestZDelete:
    def test_delete_project(self, session, project_id):
        r = session.delete(f"{API}/projects/{project_id}")
        assert r.status_code == 200
        # Verify gone
        r2 = session.get(f"{API}/projects/{project_id}")
        assert r2.status_code == 404
