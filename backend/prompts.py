"""
All LLM prompt templates for analysis, drafting, and learning extraction.
"""

from __future__ import annotations

SYSTEM_ANALYST = """You are a LinkedIn content performance analyst. Your job is to extract transferable patterns that help creators improve over time.

Key principles:
- VIRAL DILUTION: A post with unusually high impressions will naturally have a lower engagement rate. LinkedIn pushes it to cold audiences who engage less. For high-impression posts, weight reach and saves heavily over engagement rate. Do not penalize a post for rate dilution caused by viral distribution.
- SAVES = INTENT: Saves mean "I will use this later" — the strongest signal of content value. Weight saves higher than likes when judging performance.
- CTA AWARENESS: A post with cta=none or cta=link should never be penalized for low comments. Only evaluate comments when the post explicitly invited them with a question.
- PATTERN THINKING: Extract transferable rules, not post-specific observations. Every insight must be usable when writing the next post — no references to specific hook text or post content.
- HOLISTIC CLASSIFICATION: A post that reached 10x the normal audience with strong saves is a hit, even at a lower engagement rate."""


CLASSIFY_PERFORMANCE = """Classify this LinkedIn post as hit/average/miss using holistic judgment across all signals.

POST CONTENT:
{content}

POST CONTEXT:
- Type: {post_type} | Hook style: {hook_style} | CTA: {cta_type}
- Word count: {word_count} | Pillar: {pillar_name}

PERFORMANCE vs author's {total_posts}-post history:
- Impressions:    {impressions:,}  → {impressions_pct}th percentile
- Saves:          {saves}          → {saves_pct}th percentile
- Likes:          {likes}          → {likes_pct}th percentile
- Comments:       {comments}       (CTA is "{cta_type}" — weight accordingly)
- Engagement rate:{engagement_score:.4f} → {rate_pct}th percentile
- Viral flag:     {viral_flag}     (YES = shown to cold audiences, rate dilution is expected)
- Trajectory:     {trajectory}

DECISION RULES:
- "hit": Strong impressions AND/OR saves. A viral post (flag=YES) with top-half impressions and saves is a hit even if engagement rate is average or below.
- "miss": Weak across impressions, saves, AND engagement rate. All three signals must be below baseline to call it a miss.
- "average": Solid but not standout on any signal.

Respond with ONLY: classification|one-line reason
Example: hit|95th percentile for both impressions and saves; rate dilution expected from viral distribution"""


BATCH_CLASSIFY_PERFORMANCE = """Classify each LinkedIn post as hit/average/miss using holistic judgment.

AUTHOR BASELINE ({total_posts} posts — latest snapshot per post):
- Median impressions: {median_impressions:,}
- Median saves: {median_saves}
- Median engagement rate: {median_rate:.4f}

{post_blocks}

DECISION RULES:
- "hit": Strong impressions OR saves (or both). Viral posts (viral_flag=YES) are hits when impressions/saves are high even if engagement rate dropped — do not penalize for viral dilution.
- "miss": Weak across impressions, saves, AND engagement rate. All three must be weak.
- "average": Solid but not standout.

Respond in JSON: {{"<post_id>": {{"classification": "hit|average|miss", "reason": "one line"}}}}"""


EXTRACT_LEARNINGS = """Analyze this LinkedIn post's performance and extract transferable content strategy learnings.

POST:
{content}

CONTEXT:
- Type: {post_type} | Hook style: {hook_style} | Hook line: {hook_line}
- CTA: {cta_type} | Word count: {word_count}

PERFORMANCE PERCENTILES (vs author's history):
- Impressions: {impressions_pct}th percentile | Saves: {saves_pct}th percentile
- Likes: {likes_pct}th percentile | Eng. rate: {rate_pct}th percentile
- Comments: {comments} | Viral flag: {viral_flag} | Classification: {classification}

SIMILAR POSTS FOR CROSS-COMPARISON:
{similar_posts}

EXISTING LEARNINGS — do not duplicate:
{existing_learnings}

Extract 2-3 learnings. STRICT RULES:
1. Write as REUSABLE RULES — no references to this post's specific content, hook text, or wording.
   ✗ BAD: "The hook 'Apply even if you're not 100% qualified' created a bait-and-switch"
   ✓ GOOD: "Contrarian hooks that challenge widely-held beliefs outperform those challenging niche or context-specific advice"
2. Each learning must be directly evidenced by the metrics — no speculation.
3. For posts with cta=none or cta=link, do not comment on low comments — it is expected.
4. Use the similar posts comparison to identify what changed between this post and similar ones.
5. impact must be: positive | negative | context-dependent

Respond in JSON:
[{{"insight": "...", "category": "hook|format|topic|cta|tone|length|timing", "impact": "positive|negative|context-dependent", "confidence": 0.0}}]"""


BATCH_EXTRACT_LEARNINGS = """Analyze these LinkedIn posts and extract transferable content strategy learnings.

AUTHOR CONTEXT:
- {total_posts} posts | Median impressions: {median_impressions:,} | Median saves: {median_saves} | Median eng. rate: {median_rate:.4f}

{post_blocks}

EXISTING LEARNINGS — do not duplicate:
{existing_learnings}

For each post, extract 2-3 transferable learnings. STRICT RULES:
1. Write as REUSABLE RULES — no references to specific post content or hook text.
   ✗ BAD: "This post's hook 'Apply even if...' was too generic"
   ✓ GOOD: "Contrarian hooks work best when they challenge widely-held beliefs, not niche advice"
2. Cross-reference between posts when you see a cross-post pattern emerging (e.g., "both contrarian-hook posts outperformed story posts on saves").
3. For posts with cta=none or cta=link, do not penalize or comment on low comments.
4. impact: positive | negative | context-dependent

Respond in JSON: {{"<post_id>": [{{"insight": "...", "category": "hook|format|topic|cta|tone|length|timing", "impact": "positive|negative|context-dependent", "confidence": 0.0}}]}}"""


REGENERATE_PLAYBOOK = """Generate a LinkedIn content playbook from confirmed performance learnings.

PERFORMANCE OVERVIEW:
- {hits} hits | {averages} average | {misses} misses out of {total} posts analyzed

TOP LEARNINGS (sorted by evidence strength — confirmed × confidence):
{learnings}

Write a structured markdown playbook. Rules:
- Every point must come directly from the learnings above — no generic LinkedIn advice
- Note evidence strength where clearly relevant (e.g., "seen across 3 posts")
- Keep each point to 1-2 sentences max

Structure:

### Strategy Summary
2-3 sentences on what specifically drives performance for this author based on the data.

## WHAT WORKS
Patterns observed in hit posts, ordered by evidence strength.

## WHAT DOESN'T
Patterns observed in miss/average posts, ordered by evidence strength.

## CONTEXT-DEPENDENT
Learnings that only apply in certain situations (specific post type, CTA, topic, or audience).

## BEST PRACTICES
Format, length, timing, and structural guidelines grounded in the data."""


SYSTEM_DRAFTER = """You are a LinkedIn ghostwriter who crafts engaging, professional posts.
You write in the author's voice based on their top-performing posts.
You follow the author's playbook and confirmed learnings strictly.
Prioritize patterns that have been confirmed across multiple posts."""


GENERATE_DRAFT = """Write a LinkedIn post about the following topic.

Topic: {topic}
Content pillar: {pillar_name}
{pillar_description}

Style preferences: {style}

Author's playbook (strategic rules):
{playbook}

Confirmed learnings to apply directly (ordered by evidence strength):
{top_learnings}

Author's voice reference (top-performing posts):
{voice_reference}

Available hooks to consider:
{hooks}

Suggested hashtags: {hashtags}

Generate {num_variants} different variants of this post. Each variant should:
1. Start with a different hook style
2. Include the full post body
3. End with a CTA appropriate to the content
4. Include 3-5 relevant hashtags
5. Apply the confirmed learnings above — especially those with high confirmation counts

Respond in JSON format:
[
  {{
    "hook_variant": "hook style name",
    "content": "full post text including hook and CTA",
    "suggested_hashtags": ["#tag1", "#tag2"]
  }}
]"""


EXTRACT_HOOK = """Extract the hook (opening line) from this LinkedIn post and classify its style.

Post content:
{content}

Classify the hook style as one of: question, contrarian, story, stat, cliffhanger, list, statement

Respond in JSON format:
{{"hook_text": "...", "style": "..."}}"""


CALENDAR_SUGGESTIONS = """Based on the author's content pillars, posting patterns, and series schedule,
suggest a content plan for the next week.

Content pillars:
{pillars}

Active series:
{series}

Recent posting frequency: {posting_frequency} posts/week
Pillar balance (posts per pillar this month):
{pillar_balance}

Best performing days/times:
{best_times}

Suggest 3-5 posts for next week. For each:
1. Day and time
2. Topic idea
3. Which pillar it belongs to
4. Which series (if applicable)
5. Suggested hook style

Respond in JSON format:
[
  {{
    "day": "monday",
    "time": "09:00",
    "topic": "...",
    "pillar_id": 1,
    "series_id": null,
    "hook_style": "question"
  }}
]"""
