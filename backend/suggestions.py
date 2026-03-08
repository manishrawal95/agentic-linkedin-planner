"""
SQL-Powered Suggestion Engine — computes prioritized action suggestions from existing data.

Zero LLM calls. Pure SQL queries on existing tables.
Each suggestion has: type, priority, title, description, action_url, entity_id.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from backend.db import get_conn

logger = logging.getLogger(__name__)


# ── Suggestion Types (ordered by default priority) ───────────────

SUGGESTION_TYPES = {
    "metrics_needed": {"priority": 0, "icon": "bar-chart"},
    "unanalyzed_post": {"priority": 1, "icon": "search"},
    "stale_analysis": {"priority": 2, "icon": "refresh-cw"},
    "due_series": {"priority": 3, "icon": "repeat"},
    "pillar_gap": {"priority": 4, "icon": "target"},
    "pending_ideas": {"priority": 5, "icon": "lightbulb"},
    "stale_ideas": {"priority": 5, "icon": "archive"},
    "stale_draft": {"priority": 6, "icon": "pen-tool"},
    "goal_at_risk": {"priority": 7, "icon": "alert-triangle"},
    "calendar_gap": {"priority": 8, "icon": "calendar"},
    "hit_rate_drop": {"priority": 9, "icon": "trending-down"},
    "schedule_ready": {"priority": 10, "icon": "clock"},
}


def get_suggestions() -> list[dict]:
    """Compute all suggestions from SQL. Returns prioritized list."""
    suggestions: list[dict] = []

    suggestions.extend(_metrics_needed())
    suggestions.extend(_unanalyzed_posts())
    suggestions.extend(_stale_analyses())
    suggestions.extend(_pillar_gaps())
    suggestions.extend(_due_series())
    suggestions.extend(_pending_ideas())
    suggestions.extend(_stale_ideas())
    suggestions.extend(_stale_drafts())
    suggestions.extend(_goal_alerts())
    suggestions.extend(_calendar_gaps())
    suggestions.extend(_hit_rate_trend())
    suggestions.extend(_schedule_ready_drafts())

    # Sort by priority (lower = more urgent)
    suggestions.sort(key=lambda s: s["priority"])

    return suggestions


# ── Individual suggestion generators ─────────────────────────────


def _metrics_needed() -> list[dict]:
    """Posts published 24-72h ago with no metrics entered yet."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT p.id, p.content, p.posted_at
        FROM posts p
        LEFT JOIN metrics_snapshots ms ON p.id = ms.post_id
        WHERE p.author = 'me'
          AND p.posted_at IS NOT NULL
          AND p.posted_at >= datetime('now', '-3 days')
          AND p.posted_at <= datetime('now', '-1 day')
          AND ms.id IS NULL
        ORDER BY p.posted_at DESC
        LIMIT 3
    """).fetchall()

    return [
        {
            "id": f"metrics_{r['id']}",
            "type": "metrics_needed",
            "priority": SUGGESTION_TYPES["metrics_needed"]["priority"],
            "icon": SUGGESTION_TYPES["metrics_needed"]["icon"],
            "title": "Enter metrics for recent post",
            "description": f"{r['content'][:80]}... — posted {r['posted_at'][:10]}",
            "action_url": f"/linkedin/posts/{r['id']}",
            "action_label": "Add Metrics",
            "entity_type": "post",
            "entity_id": r["id"],
        }
        for r in rows
    ]


def _stale_ideas() -> list[dict]:
    """Pending ideas older than 10 days — approve or archive."""
    conn = get_conn()
    count_row = conn.execute("""
        SELECT COUNT(*) as cnt
        FROM ideas
        WHERE status = 'pending'
          AND created_at <= datetime('now', '-10 days')
    """).fetchone()

    count = count_row["cnt"] if count_row else 0
    if count == 0:
        return []

    return [
        {
            "id": "stale_ideas",
            "type": "stale_ideas",
            "priority": SUGGESTION_TYPES["stale_ideas"]["priority"],
            "icon": SUGGESTION_TYPES["stale_ideas"]["icon"],
            "title": f"{count} stale idea{'s' if count > 1 else ''} (10+ days old)",
            "description": "Approve or archive old ideas to keep your pipeline fresh.",
            "action_url": "/linkedin/ideas",
            "action_label": "Review Ideas",
            "entity_type": "idea",
            "entity_id": None,
            "metadata": {"count": count},
        }
    ]


def _unanalyzed_posts() -> list[dict]:
    """Posts that have metrics but haven't been analyzed yet."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT p.id, p.content, p.posted_at,
               lm.impressions, lm.likes
        FROM posts p
        JOIN latest_metrics lm ON p.id = lm.post_id
        WHERE p.author = 'me'
          AND p.last_analyzed_at IS NULL
          AND p.classification IS NULL
        ORDER BY p.posted_at DESC
        LIMIT 5
    """).fetchall()

    return [
        {
            "id": f"unanalyzed_{r['id']}",
            "type": "unanalyzed_post",
            "priority": SUGGESTION_TYPES["unanalyzed_post"]["priority"],
            "icon": SUGGESTION_TYPES["unanalyzed_post"]["icon"],
            "title": "Analyze post performance",
            "description": f"{r['content'][:80]}... — {r['impressions'] or 0} impressions, {r['likes'] or 0} likes",
            "action_url": f"/linkedin/posts/{r['id']}",
            "action_label": "Analyze",
            "entity_type": "post",
            "entity_id": r["id"],
        }
        for r in rows
    ]


def _stale_analyses() -> list[dict]:
    """Posts where new metrics arrived after last analysis."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT p.id, p.content, p.last_analyzed_at,
               MAX(ms.snapshot_at) as latest_snapshot
        FROM posts p
        JOIN metrics_snapshots ms ON p.id = ms.post_id
        WHERE p.author = 'me'
          AND p.last_analyzed_at IS NOT NULL
          AND ms.snapshot_at > p.last_analyzed_at
        GROUP BY p.id
        ORDER BY ms.snapshot_at DESC
        LIMIT 3
    """).fetchall()

    return [
        {
            "id": f"stale_{r['id']}",
            "type": "stale_analysis",
            "priority": SUGGESTION_TYPES["stale_analysis"]["priority"],
            "icon": SUGGESTION_TYPES["stale_analysis"]["icon"],
            "title": "Re-analyze with new metrics",
            "description": f"{r['content'][:80]}... — metrics updated since last analysis",
            "action_url": f"/linkedin/posts/{r['id']}",
            "action_label": "Re-analyze",
            "entity_type": "post",
            "entity_id": r["id"],
        }
        for r in rows
    ]


def _pillar_gaps() -> list[dict]:
    """Pillars with zero posts in last 14 days."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT cp.id, cp.name, cp.color,
               COUNT(p.id) as recent_posts,
               MAX(p.posted_at) as last_posted
        FROM content_pillars cp
        LEFT JOIN posts p ON p.pillar_id = cp.id
            AND p.author = 'me'
            AND p.posted_at >= date('now', '-14 days')
        GROUP BY cp.id
        HAVING recent_posts = 0
        ORDER BY last_posted ASC NULLS FIRST
    """).fetchall()

    return [
        {
            "id": f"pillar_gap_{r['id']}",
            "type": "pillar_gap",
            "priority": SUGGESTION_TYPES["pillar_gap"]["priority"],
            "icon": SUGGESTION_TYPES["pillar_gap"]["icon"],
            "title": f"No recent {r['name']} posts",
            "description": f"Last post: {r['last_posted'] or 'never'}. This pillar needs attention.",
            "action_url": f"/linkedin/ideas",
            "action_label": "Generate Ideas",
            "entity_type": "pillar",
            "entity_id": r["id"],
            "metadata": {"pillar_name": r["name"], "pillar_color": r["color"]},
        }
        for r in rows
    ]


def _due_series() -> list[dict]:
    """Series that are overdue for a new installment."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT cs.id, cs.name, cs.frequency,
               cp.name as pillar_name,
               MAX(p.posted_at) as last_posted,
               COUNT(p.id) as total_posts
        FROM content_series cs
        LEFT JOIN content_pillars cp ON cs.pillar_id = cp.id
        LEFT JOIN posts p ON p.series_id = cs.id AND p.author = 'me'
        WHERE cs.is_active = 1
        GROUP BY cs.id
        HAVING last_posted IS NULL
           OR (cs.frequency = 'daily' AND last_posted < date('now', '-1 day'))
           OR (cs.frequency = 'weekly' AND last_posted < date('now', '-7 days'))
           OR (cs.frequency = 'biweekly' AND last_posted < date('now', '-14 days'))
           OR (cs.frequency = 'monthly' AND last_posted < date('now', '-30 days'))
        ORDER BY last_posted ASC NULLS FIRST
        LIMIT 3
    """).fetchall()

    return [
        {
            "id": f"series_{r['id']}",
            "type": "due_series",
            "priority": SUGGESTION_TYPES["due_series"]["priority"],
            "icon": SUGGESTION_TYPES["due_series"]["icon"],
            "title": f'"{r["name"]}" is overdue',
            "description": f"{r['frequency'].title()} series -- last posted {r['last_posted'] or 'never'}",
            "action_url": "/linkedin/ideas",
            "action_label": "Draft Next",
            "entity_type": "series",
            "entity_id": r["id"],
        }
        for r in rows
    ]


def _pending_ideas() -> list[dict]:
    """Ideas awaiting review for more than 2 days."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT i.id, i.topic, i.score, i.fit_reason, i.source,
               cp.name as pillar_name, cp.color as pillar_color,
               i.created_at
        FROM ideas i
        LEFT JOIN content_pillars cp ON i.pillar_id = cp.id
        WHERE i.status = 'pending'
          AND i.created_at <= datetime('now', '-2 days')
        ORDER BY i.score DESC
        LIMIT 5
    """).fetchall()

    if not rows:
        return []

    count = len(rows)
    top = rows[0]
    return [
        {
            "id": "pending_ideas",
            "type": "pending_ideas",
            "priority": SUGGESTION_TYPES["pending_ideas"]["priority"],
            "icon": SUGGESTION_TYPES["pending_ideas"]["icon"],
            "title": f"{count} idea{'s' if count > 1 else ''} awaiting review",
            "description": f'Top: "{top["topic"]}" ({top["fit_reason"] or "scored " + str(round(top["score"], 1))})',
            "action_url": "/linkedin/ideas",
            "action_label": "Review Ideas",
            "entity_type": "idea",
            "entity_id": top["id"],
            "metadata": {"count": count},
        }
    ]


def _stale_drafts() -> list[dict]:
    """Drafts sitting untouched for more than 7 days."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT d.id, d.topic, d.created_at, d.updated_at,
               cp.name as pillar_name
        FROM drafts d
        LEFT JOIN content_pillars cp ON d.pillar_id = cp.id
        WHERE d.status IN ('draft', 'revised')
          AND d.updated_at <= datetime('now', '-7 days')
        ORDER BY d.updated_at ASC
        LIMIT 5
    """).fetchall()

    return [
        {
            "id": f"stale_draft_{r['id']}",
            "type": "stale_draft",
            "priority": SUGGESTION_TYPES["stale_draft"]["priority"],
            "icon": SUGGESTION_TYPES["stale_draft"]["icon"],
            "title": f"Draft needs attention",
            "description": f'"{r["topic"][:60]}" -- untouched for 7+ days',
            "action_url": f"/linkedin/drafts",
            "action_label": "Edit Draft",
            "entity_type": "draft",
            "entity_id": r["id"],
        }
        for r in rows
    ]


def _goal_alerts() -> list[dict]:
    """Goals that are falling behind pace."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT id, metric, target_value, current_value, deadline
        FROM goals
        WHERE status = 'active'
          AND deadline IS NOT NULL
          AND current_value < target_value
        ORDER BY deadline ASC
    """).fetchall()

    alerts = []
    now = datetime.now(timezone.utc)

    for r in rows:
        try:
            deadline = datetime.fromisoformat(r["deadline"].replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue

        # Check if behind pace
        total_needed = r["target_value"] - r["current_value"]
        if total_needed <= 0:
            continue

        days_left = (deadline - now).days
        if days_left <= 0:
            pace_text = "overdue"
        elif days_left <= 7:
            pace_text = f"{days_left} days left"
        else:
            continue  # Not urgent enough

        alerts.append({
            "id": f"goal_{r['id']}",
            "type": "goal_at_risk",
            "priority": SUGGESTION_TYPES["goal_at_risk"]["priority"],
            "icon": SUGGESTION_TYPES["goal_at_risk"]["icon"],
            "title": f"Goal at risk: {r['metric']}",
            "description": f"{r['current_value']:.0f}/{r['target_value']:.0f} — {pace_text}",
            "action_url": "/linkedin",
            "action_label": "View Goal",
            "entity_type": "goal",
            "entity_id": r["id"],
        })

    return alerts[:3]


def _calendar_gaps() -> list[dict]:
    """Days in the next 7 with no scheduled content."""
    conn = get_conn()
    occupied = conn.execute("""
        SELECT scheduled_date
        FROM content_calendar
        WHERE scheduled_date >= date('now')
          AND scheduled_date <= date('now', '+7 days')
          AND status != 'skipped'
    """).fetchall()

    occupied_dates = {r["scheduled_date"] for r in occupied}

    # Check how many of next 7 weekdays are empty
    from datetime import timedelta
    today = datetime.now(timezone.utc).date()
    gaps = []
    for i in range(1, 8):
        d = today + timedelta(days=i)
        if d.weekday() < 5 and d.isoformat() not in occupied_dates:  # weekdays only
            gaps.append(d)

    if len(gaps) < 3:
        return []  # Few gaps is normal

    return [
        {
            "id": "calendar_gaps",
            "type": "calendar_gap",
            "priority": SUGGESTION_TYPES["calendar_gap"]["priority"],
            "icon": SUGGESTION_TYPES["calendar_gap"]["icon"],
            "title": f"{len(gaps)} empty days this week",
            "description": f"Next 7 weekdays have {len(gaps)} open slots. Schedule content to maintain consistency.",
            "action_url": "/linkedin/calendar",
            "action_label": "View Calendar",
            "entity_type": "calendar",
            "entity_id": None,
            "metadata": {"gap_dates": [d.isoformat() for d in gaps[:5]]},
        }
    ]


def _hit_rate_trend() -> list[dict]:
    """Detect if recent hit rate is declining compared to overall."""
    conn = get_conn()

    # Overall hit rate
    total = conn.execute("""
        SELECT COUNT(*) as total,
               SUM(CASE WHEN classification = 'hit' THEN 1 ELSE 0 END) as hits
        FROM posts
        WHERE author = 'me' AND classification IS NOT NULL
    """).fetchone()

    if not total or total["total"] < 10:
        return []

    overall_rate = total["hits"] / total["total"]

    # Recent hit rate (last 5 analyzed posts)
    recent = conn.execute("""
        SELECT classification
        FROM posts
        WHERE author = 'me' AND classification IS NOT NULL
        ORDER BY last_analyzed_at DESC
        LIMIT 5
    """).fetchall()

    if len(recent) < 5:
        return []

    recent_hits = sum(1 for r in recent if r["classification"] == "hit")
    recent_rate = recent_hits / len(recent)

    # Alert if recent rate dropped by 15%+ from overall
    if recent_rate >= overall_rate - 0.15:
        return []

    return [
        {
            "id": "hit_rate_drop",
            "type": "hit_rate_drop",
            "priority": SUGGESTION_TYPES["hit_rate_drop"]["priority"],
            "icon": SUGGESTION_TYPES["hit_rate_drop"]["icon"],
            "title": "Hit rate declining",
            "description": f"Recent: {recent_rate:.0%} vs overall: {overall_rate:.0%}. Review your last 5 posts for patterns.",
            "action_url": "/linkedin/posts",
            "action_label": "Review Posts",
            "entity_type": "trend",
            "entity_id": None,
        }
    ]


def _schedule_ready_drafts() -> list[dict]:
    """Approved/ready drafts that aren't scheduled yet."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT d.id, d.topic, d.status, d.confidence,
               cp.name as pillar_name
        FROM drafts d
        LEFT JOIN content_pillars cp ON d.pillar_id = cp.id
        WHERE d.status IN ('draft', 'revised', 'ready')
          AND d.id NOT IN (SELECT draft_id FROM content_calendar WHERE draft_id IS NOT NULL)
        ORDER BY d.confidence DESC NULLS LAST
        LIMIT 3
    """).fetchall()

    if not rows:
        return []

    return [
        {
            "id": f"schedule_{r['id']}",
            "type": "schedule_ready",
            "priority": SUGGESTION_TYPES["schedule_ready"]["priority"],
            "icon": SUGGESTION_TYPES["schedule_ready"]["icon"],
            "title": f"Ready to schedule",
            "description": f'"{r["topic"][:60]}" -- {r["pillar_name"] or "no pillar"}',
            "action_url": "/linkedin/drafts",
            "action_label": "Schedule",
            "entity_type": "draft",
            "entity_id": r["id"],
        }
        for r in rows
    ]
