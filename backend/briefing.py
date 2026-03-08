"""
Morning Briefing — one cached LLM call per session.

SQL gathers signals, LLM narrates them into a personalized briefing.
Cached for 6 hours. Fallback to raw signals if LLM fails.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone

from backend import prompts
from backend.db import get_conn
from backend.llm import generate
from backend.suggestions import get_suggestions
from backend.utils import parse_llm_json

logger = logging.getLogger(__name__)

# In-memory cache (persists across requests within same process)
_cache: dict | None = None


def _compute_data_hash(signals: dict) -> str:
    """Hash key signals that would change the briefing's relevance."""
    key_parts = [
        str(signals.get("total_posts", 0)),
        str(signals.get("pending_idea_count", 0)),
        str(signals.get("active_draft_count", 0)),
        str(signals.get("days_since_last_post", 0)),
        datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    ]
    return hashlib.sha256("|".join(key_parts).encode()).hexdigest()[:16]


def _gather_signals() -> dict:
    """Gather all data signals for the briefing. Pure SQL."""
    conn = get_conn()
    signals: dict = {}

    # Suggestion counts
    suggestions = get_suggestions()
    signals["suggestion_count"] = len(suggestions)
    signals["suggestion_types"] = {}
    for s in suggestions:
        t = s["type"]
        signals["suggestion_types"][t] = signals["suggestion_types"].get(t, 0) + 1
    signals["top_suggestions"] = [
        {"type": s["type"], "title": s["title"]} for s in suggestions[:5]
    ]

    # Recent analysis results
    recent_posts = conn.execute("""
        SELECT p.content, p.classification, p.posted_at,
               cp.name as pillar_name,
               lm.impressions, lm.engagement_score
        FROM posts p
        LEFT JOIN content_pillars cp ON p.pillar_id = cp.id
        LEFT JOIN latest_metrics lm ON p.id = lm.post_id
        WHERE p.author = 'me' AND p.classification IS NOT NULL
        ORDER BY p.last_analyzed_at DESC
        LIMIT 3
    """).fetchall()
    signals["recent_analyses"] = [
        {
            "content_preview": r["content"][:80],
            "classification": r["classification"],
            "pillar": r["pillar_name"],
            "impressions": r["impressions"],
            "engagement": round(r["engagement_score"] * 100, 1) if r["engagement_score"] else 0,
        }
        for r in recent_posts
    ]

    # Hit rate
    total = conn.execute("""
        SELECT COUNT(*) as total,
               SUM(CASE WHEN classification = 'hit' THEN 1 ELSE 0 END) as hits
        FROM posts WHERE author = 'me' AND classification IS NOT NULL
    """).fetchone()
    signals["total_posts"] = total["total"] if total else 0
    signals["hit_rate"] = round(total["hits"] / total["total"], 2) if total and total["total"] > 0 else 0

    # Recent hit rate (last 5)
    recent5 = conn.execute("""
        SELECT classification FROM posts
        WHERE author = 'me' AND classification IS NOT NULL
        ORDER BY last_analyzed_at DESC LIMIT 5
    """).fetchall()
    if len(recent5) >= 5:
        recent_hits = sum(1 for r in recent5 if r["classification"] == "hit")
        signals["recent_hit_rate"] = round(recent_hits / len(recent5), 2)
    else:
        signals["recent_hit_rate"] = None

    # Days since last post
    last_post = conn.execute("""
        SELECT posted_at FROM posts
        WHERE author = 'me' AND posted_at IS NOT NULL
        ORDER BY posted_at DESC LIMIT 1
    """).fetchone()
    if last_post and last_post["posted_at"]:
        try:
            lp = datetime.fromisoformat(last_post["posted_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            # Handle naive datetimes from SQLite
            if lp.tzinfo is None:
                lp = lp.replace(tzinfo=timezone.utc)
            signals["days_since_last_post"] = (now - lp).days
        except (ValueError, AttributeError):
            signals["days_since_last_post"] = None
    else:
        signals["days_since_last_post"] = None

    # Goal progress
    goals = conn.execute("""
        SELECT metric, current_value, target_value, deadline
        FROM goals WHERE status = 'active'
        ORDER BY created_at DESC LIMIT 3
    """).fetchall()
    signals["goals"] = [
        {
            "metric": g["metric"],
            "current": g["current_value"],
            "target": g["target_value"],
            "deadline": g["deadline"],
        }
        for g in goals
    ]

    # Calendar next 3
    calendar = conn.execute("""
        SELECT cc.scheduled_date, cc.scheduled_time,
               d.topic as draft_topic, cp.name as pillar_name
        FROM content_calendar cc
        LEFT JOIN drafts d ON cc.draft_id = d.id
        LEFT JOIN content_pillars cp ON cc.pillar_id = cp.id
        WHERE cc.scheduled_date >= date('now') AND cc.status != 'skipped'
        ORDER BY cc.scheduled_date ASC LIMIT 3
    """).fetchall()
    signals["upcoming"] = [
        {
            "date": c["scheduled_date"],
            "time": c["scheduled_time"],
            "topic": c["draft_topic"],
            "pillar": c["pillar_name"],
        }
        for c in calendar
    ]

    # Pillar gaps
    gaps = conn.execute("""
        SELECT cp.name FROM content_pillars cp
        LEFT JOIN posts p ON p.pillar_id = cp.id
            AND p.author = 'me'
            AND p.posted_at >= date('now', '-14 days')
        GROUP BY cp.id
        HAVING COUNT(p.id) = 0
    """).fetchall()
    signals["pillar_gaps"] = [g["name"] for g in gaps]

    # Pending ideas + active drafts
    signals["pending_idea_count"] = conn.execute(
        "SELECT COUNT(*) as cnt FROM ideas WHERE status = 'pending'"
    ).fetchone()["cnt"]

    signals["active_draft_count"] = conn.execute(
        "SELECT COUNT(*) as cnt FROM drafts WHERE status IN ('draft', 'revised')"
    ).fetchone()["cnt"]

    # Strategy health
    sr = conn.execute("SELECT health_score, diagnosis FROM strategy_reviews WHERE id = 1").fetchone()
    if sr:
        signals["health_score"] = sr["health_score"]
        signals["diagnosis"] = sr["diagnosis"][:120]
    else:
        signals["health_score"] = None
        signals["diagnosis"] = None

    # Top learning
    learning = conn.execute("""
        SELECT insight FROM learnings
        WHERE confidence >= 0.6 OR times_confirmed > 1
        ORDER BY times_confirmed DESC, confidence DESC LIMIT 1
    """).fetchone()
    signals["top_learning"] = learning["insight"] if learning else None

    return signals


def _build_fallback(signals: dict) -> dict:
    """Deterministic fallback when LLM is unavailable."""
    parts = []

    if signals.get("days_since_last_post") is not None:
        if signals["days_since_last_post"] == 0:
            parts.append("You posted today.")
        elif signals["days_since_last_post"] <= 2:
            parts.append(f"Last post was {signals['days_since_last_post']} day(s) ago.")
        else:
            parts.append(f"It has been {signals['days_since_last_post']} days since your last post.")

    if signals.get("total_posts", 0) > 0:
        parts.append(f"Hit rate: {signals['hit_rate']:.0%} across {signals['total_posts']} posts.")

    if signals.get("pillar_gaps"):
        parts.append(f"Pillar gaps: {', '.join(signals['pillar_gaps'][:3])}.")

    if signals.get("suggestion_count", 0) > 0:
        parts.append(f"{signals['suggestion_count']} actions need attention.")

    priority = "Review your pending suggestions to keep momentum."
    if signals.get("pillar_gaps"):
        priority = f"Generate ideas for your {signals['pillar_gaps'][0]} pillar."
    elif signals.get("days_since_last_post") and signals["days_since_last_post"] > 3:
        priority = "Draft and schedule a post to maintain consistency."

    return {
        "briefing": " ".join(parts) if parts else "Welcome. Start by adding your first post.",
        "priority_action": priority,
        "generated_by": "fallback",
    }


async def generate_briefing(force: bool = False) -> dict:
    """Generate or return cached morning briefing."""
    global _cache

    signals = _gather_signals()
    data_hash = _compute_data_hash(signals)

    # Check cache
    if not force and _cache is not None:
        cache_date = _cache.get("date", "")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if cache_date == today and _cache.get("data_hash") == data_hash:
            hours_old = (datetime.now(timezone.utc) - datetime.fromisoformat(_cache["generated_at"])).total_seconds() / 3600
            if hours_old < 6:
                return {
                    "briefing": _cache["briefing"],
                    "priority_action": _cache["priority_action"],
                    "generated_at": _cache["generated_at"],
                    "cached": True,
                    "stale": False,
                    "generated_by": _cache.get("generated_by", "llm"),
                }
            # Stale but same day — return with stale flag
            return {
                "briefing": _cache["briefing"],
                "priority_action": _cache["priority_action"],
                "generated_at": _cache["generated_at"],
                "cached": True,
                "stale": True,
                "generated_by": _cache.get("generated_by", "llm"),
            }

    # Generate fresh
    try:
        signals_text = json.dumps(signals, indent=2, default=str)
        prompt = prompts.MORNING_BRIEFING.format(signals=signals_text)
        raw = await generate(prompt, system="", feature="briefing")
        parsed = parse_llm_json(raw)

        briefing_text = parsed.get("briefing", "")
        priority_action = parsed.get("priority_action", "")

        if not briefing_text:
            raise ValueError("LLM returned empty briefing")

        result = {
            "briefing": briefing_text,
            "priority_action": priority_action,
            "generated_by": "llm",
        }

    except Exception as e:
        logger.warning("Morning briefing LLM call failed: %s", e)
        result = _build_fallback(signals)

    now = datetime.now(timezone.utc).isoformat()
    _cache = {
        **result,
        "generated_at": now,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "data_hash": data_hash,
    }

    return {
        **result,
        "generated_at": now,
        "cached": False,
        "stale": False,
    }


def invalidate_cache() -> None:
    """Invalidate the briefing cache. Call after data changes."""
    global _cache
    _cache = None
