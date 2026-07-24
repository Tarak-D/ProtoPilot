"""Real DeepSearch: ArXiv + GitHub public APIs. Uses GitHub PAT when available."""
import asyncio
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

import requests

ARXIV_ENDPOINT = "http://export.arxiv.org/api/query"
GH_SEARCH = "https://api.github.com/search/repositories"
REDDIT_SEARCH = "https://www.reddit.com/search.json"
SO_SEARCH = "https://api.stackexchange.com/2.3/search/advanced"
SERPER_ENDPOINT = "https://google.serper.dev/search"
YT_SEARCH = "https://www.googleapis.com/youtube/v3/search"
UA = {"User-Agent": "ProtoPilot/0.1 (research copilot)"}
NS = {"a": "http://www.w3.org/2005/Atom"}

# Simple in-process TTL cache to spare GitHub rate limits
_cache: Dict[str, tuple] = {}
_TTL = 600  # 10 minutes


def _cache_get(key: str):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < _TTL:
        return hit[1]
    return None


def _cache_put(key: str, val):
    _cache[key] = (time.time(), val)


def _clean(q: str) -> str:
    q = re.sub(r"[^a-zA-Z0-9\s]", " ", q).strip()
    # Keep first 6 keywords for relevance
    return " ".join(q.split()[:6])


def _arxiv_sync(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    params = {"search_query": f"all:{_clean(query)}", "start": 0, "max_results": max_results,
              "sortBy": "relevance", "sortOrder": "descending"}
    try:
        r = requests.get(ARXIV_ENDPOINT, params=params, headers=UA, timeout=12)
        r.raise_for_status()
        root = ET.fromstring(r.text)
        out = []
        for entry in root.findall("a:entry", NS):
            title = (entry.find("a:title", NS).text or "").strip().replace("\n", " ")
            summary = (entry.find("a:summary", NS).text or "").strip().replace("\n", " ")
            link_el = entry.find("a:id", NS)
            url = (link_el.text or "").strip() if link_el is not None else ""
            published = (entry.find("a:published", NS).text or "")[:10] if entry.find("a:published", NS) is not None else ""
            out.append({
                "title": title[:180],
                "url": url,
                "source": "arxiv",
                "date": published,
                "snippet": summary[:220] + ("…" if len(summary) > 220 else ""),
            })
        return out
    except Exception:
        return []


def _gh_headers(token: Optional[str] = None) -> Dict[str, str]:
    h = dict(UA)
    h["Accept"] = "application/vnd.github+json"
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _gh_sync(query: str, max_results: int = 5, token: Optional[str] = None) -> List[Dict[str, Any]]:
    key = f"gh:{_clean(query)}:{max_results}:{bool(token)}"
    hit = _cache_get(key)
    if hit is not None:
        return hit
    params = {"q": _clean(query), "sort": "stars", "order": "desc", "per_page": max_results}
    try:
        r = requests.get(GH_SEARCH, params=params, headers=_gh_headers(token), timeout=12)
        r.raise_for_status()
        items = r.json().get("items", [])
        out = [{
            "title": it.get("full_name", ""),
            "url": it.get("html_url", ""),
            "source": "github",
            "date": (it.get("pushed_at") or "")[:10],
            "stars": it.get("stargazers_count", 0),
            "snippet": (it.get("description") or "")[:220],
        } for it in items]
        _cache_put(key, out)
        return out
    except Exception:
        return []


def _gh_failed_sync(query: str, max_items: int = 4, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Find real GitHub repos that look abandoned:
    - No push in last 12 months, OR archived
    - Low-medium star range (real 'dead' projects, not blockbusters)
    Prefers older/less active ones as the museum exhibits.
    """
    key = f"ghdead:{_clean(query)}:{max_items}:{bool(token)}"
    hit = _cache_get(key)
    if hit is not None:
        return hit
    params = {"q": f"{_clean(query)} stars:5..500", "sort": "updated", "order": "asc", "per_page": 20}
    try:
        r = requests.get(GH_SEARCH, params=params, headers=_gh_headers(token), timeout=12)
        r.raise_for_status()
        items = r.json().get("items", [])
        cutoff = datetime.now(timezone.utc) - timedelta(days=365)
        dead = []
        for it in items:
            pushed = it.get("pushed_at") or ""
            try:
                pushed_dt = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
            except Exception:
                pushed_dt = None
            archived = it.get("archived", False)
            if archived or (pushed_dt and pushed_dt < cutoff):
                dead.append({
                    "name": it.get("full_name", ""),
                    "url": it.get("html_url", ""),
                    "stars": it.get("stargazers_count", 0),
                    "last_commit": (pushed or "")[:7],
                    "description": (it.get("description") or "")[:200],
                    "open_issues": it.get("open_issues_count", 0),
                    "archived": archived,
                })
            if len(dead) >= max_items:
                break
        _cache_put(key, dead)
        return dead
    except Exception:
        return []


async def arxiv_search(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    key = f"arxiv:{_clean(query)}:{max_results}"
    hit = _cache_get(key)
    if hit is not None:
        return hit
    res = await asyncio.to_thread(_arxiv_sync, query, max_results)
    _cache_put(key, res)
    return res


async def github_search(query: str, max_results: int = 5, token: Optional[str] = None) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_gh_sync, query, max_results, token)


async def github_failed_repos(query: str, max_items: int = 4, token: Optional[str] = None) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_gh_failed_sync, query, max_items, token)


async def combined_citations(query: str, token: Optional[str] = None,
                              serper_key: Optional[str] = None,
                              youtube_key: Optional[str] = None,
                              reddit_cid: Optional[str] = None,
                              reddit_secret: Optional[str] = None) -> List[Dict[str, Any]]:
    ax, gh, rd, so, sp, yt = await asyncio.gather(
        arxiv_search(query, 3),
        github_search(query, 3, token),
        reddit_search(query, 3, reddit_cid, reddit_secret),
        stackoverflow_search(query, 3),
        serper_search(query, serper_key, 3) if serper_key else _empty(),
        youtube_search(query, youtube_key, 3) if youtube_key else _empty(),
    )
    # Interleave for diversity across sources
    buckets = [ax, gh, rd, so, sp, yt]
    out: List[Dict[str, Any]] = []
    idx = 0
    while any(idx < len(b) for b in buckets):
        for b in buckets:
            if idx < len(b):
                out.append(b[idx])
        idx += 1
    return out[:12]


async def _empty() -> List[Dict[str, Any]]:
    return []


# ============== Reddit (OAuth script-app) ==============
_reddit_token: Dict[str, Any] = {"token": None, "exp": 0}


def _reddit_get_token(cid: str, secret: str) -> Optional[str]:
    if _reddit_token["token"] and time.time() < _reddit_token["exp"]:
        return _reddit_token["token"]
    try:
        r = requests.post(
            "https://www.reddit.com/api/v1/access_token",
            data={"grant_type": "client_credentials"},
            auth=(cid, secret),
            headers={"User-Agent": "protopilot/0.1 by /u/protopilot"},
            timeout=10,
        )
        r.raise_for_status()
        d = r.json()
        _reddit_token["token"] = d.get("access_token")
        _reddit_token["exp"] = time.time() + int(d.get("expires_in", 3600)) - 60
        return _reddit_token["token"]
    except Exception:
        return None


def _reddit_sync(query: str, max_results: int = 3,
                 cid: Optional[str] = None, secret: Optional[str] = None) -> List[Dict[str, Any]]:
    key = f"reddit:{_clean(query)}:{max_results}:{bool(cid)}"
    hit = _cache_get(key)
    if hit is not None:
        return hit
    # OAuth path
    if cid and secret:
        tok = _reddit_get_token(cid, secret)
        if not tok:
            return []
        try:
            r = requests.get(
                "https://oauth.reddit.com/search",
                params={"q": _clean(query), "limit": max_results, "sort": "relevance", "t": "year"},
                headers={"Authorization": f"Bearer {tok}", "User-Agent": "protopilot/0.1 by /u/protopilot"},
                timeout=12,
            )
            r.raise_for_status()
            data = r.json()
            out = []
            for c in data.get("data", {}).get("children", []):
                d = c.get("data", {})
                out.append({
                    "title": d.get("title", "")[:180],
                    "url": "https://www.reddit.com" + d.get("permalink", ""),
                    "source": "reddit",
                    "date": "",
                    "stars": d.get("ups", 0),
                    "snippet": (d.get("selftext") or d.get("subreddit_name_prefixed", ""))[:220],
                })
            _cache_put(key, out)
            return out
        except Exception:
            return []
    # Anonymous path (will likely 403 in cloud IPs, kept as best-effort)
    params = {"q": _clean(query), "limit": max_results, "sort": "relevance", "t": "year"}
    try:
        r = requests.get(REDDIT_SEARCH, params=params, headers=UA, timeout=12)
        r.raise_for_status()
        data = r.json()
        out = []
        for c in data.get("data", {}).get("children", []):
            d = c.get("data", {})
            out.append({
                "title": d.get("title", "")[:180],
                "url": "https://www.reddit.com" + d.get("permalink", ""),
                "source": "reddit",
                "date": "",
                "stars": d.get("ups", 0),
                "snippet": (d.get("selftext") or d.get("subreddit_name_prefixed", ""))[:220],
            })
        _cache_put(key, out)
        return out
    except Exception:
        return []


async def reddit_search(query: str, max_results: int = 3,
                        cid: Optional[str] = None, secret: Optional[str] = None) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_reddit_sync, query, max_results, cid, secret)


# ============== StackOverflow (free, no key) ==============
def _so_sync(query: str, max_results: int = 3) -> List[Dict[str, Any]]:
    key = f"so:{_clean(query)}:{max_results}"
    hit = _cache_get(key)
    if hit is not None:
        return hit
    # Use only first 4 keywords for better recall on SO
    q_short = " ".join(_clean(query).split()[:4])
    params = {"order": "desc", "sort": "relevance", "q": q_short,
              "site": "stackoverflow", "pagesize": max_results, "filter": "default"}
    try:
        r = requests.get(SO_SEARCH, params=params, headers=UA, timeout=12)
        r.raise_for_status()
        items = r.json().get("items", [])
        out = []
        for it in items:
            ts = it.get("creation_date")
            date = datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d") if ts else ""
            out.append({
                "title": (it.get("title") or "")[:180],
                "url": it.get("link", ""),
                "source": "stackoverflow",
                "date": date,
                "stars": it.get("score", 0),
                "snippet": f"Answers: {it.get('answer_count', 0)} · Views: {it.get('view_count', 0)} · Tags: {', '.join(it.get('tags', [])[:4])}",
            })
        _cache_put(key, out)
        return out
    except Exception:
        return []


async def stackoverflow_search(query: str, max_results: int = 3) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_so_sync, query, max_results)


# ============== Serper (Google search, requires key) ==============
def _serper_sync(query: str, key: str, max_results: int = 3) -> List[Dict[str, Any]]:
    cache_key = f"serper:{_clean(query)}:{max_results}"
    hit = _cache_get(cache_key)
    if hit is not None:
        return hit
    try:
        r = requests.post(
            SERPER_ENDPOINT,
            json={"q": _clean(query), "num": max_results},
            headers={"X-API-KEY": key, "Content-Type": "application/json"},
            timeout=12,
        )
        r.raise_for_status()
        data = r.json()
        out = []
        for it in (data.get("organic") or [])[:max_results]:
            out.append({
                "title": (it.get("title") or "")[:180],
                "url": it.get("link", ""),
                "source": "google",
                "date": it.get("date", ""),
                "snippet": (it.get("snippet") or "")[:220],
            })
        _cache_put(cache_key, out)
        return out
    except Exception:
        return []


async def serper_search(query: str, key: str, max_results: int = 3) -> List[Dict[str, Any]]:
    if not key:
        return []
    return await asyncio.to_thread(_serper_sync, query, key, max_results)


# ============== YouTube Data API (requires key) ==============
def _yt_sync(query: str, key: str, max_results: int = 3) -> List[Dict[str, Any]]:
    cache_key = f"yt:{_clean(query)}:{max_results}"
    hit = _cache_get(cache_key)
    if hit is not None:
        return hit
    params = {"key": key, "q": _clean(query), "part": "snippet",
              "type": "video", "maxResults": max_results, "order": "relevance"}
    try:
        r = requests.get(YT_SEARCH, params=params, headers=UA, timeout=12)
        r.raise_for_status()
        items = r.json().get("items", [])
        out = []
        for it in items:
            vid = (it.get("id") or {}).get("videoId", "")
            sn = it.get("snippet") or {}
            out.append({
                "title": (sn.get("title") or "")[:180],
                "url": f"https://www.youtube.com/watch?v={vid}",
                "source": "youtube",
                "date": (sn.get("publishedAt") or "")[:10],
                "snippet": ((sn.get("description") or "") + " · " + (sn.get("channelTitle") or ""))[:220],
            })
        _cache_put(cache_key, out)
        return out
    except Exception:
        return []


async def youtube_search(query: str, key: str, max_results: int = 3) -> List[Dict[str, Any]]:
    if not key:
        return []
    return await asyncio.to_thread(_yt_sync, query, key, max_results)
