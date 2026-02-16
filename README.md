# LinkedIn Post Planner

AI-powered content planning and analytics system for LinkedIn. Track post performance, extract insights, generate drafts in your voice, and optimize your content strategy — all running locally.

## What It Does

```
Your Posts → Metrics → AI Analysis → Learnings (with confidence) → Playbook → AI Drafts
```

1. **Log posts** and record performance metrics (impressions, likes, comments, saves, etc.)
2. **AI classifies** each post as hit/average/miss relative to your baseline
3. **Extracts learnings** with confidence scores (e.g., "contrarian hooks work — 95% confidence")
4. **Generates a playbook** of DOs, DON'Ts, and best practices from your data
5. **Drafts new posts** using your playbook, top-performing voice, and hook library

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | FastAPI, SQLite, Pydantic |
| AI | Google GenAI or Anthropic (configurable) |

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
LLM_PROVIDER=google          # or "anthropic"
GOOGLE_API_KEY=your-key-here  # or ANTHROPIC_API_KEY
```

```bash
python -m backend.server
# Runs on http://localhost:8200
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

Open http://localhost:3000/linkedin to access the dashboard.

## Features

### Dashboard
Central hub with stat cards, engagement trend chart, pillar balance donut, posting heatmap (best day/hour), recent posts, playbook view, and goal tracker.

### Post Library
Add published posts, record metrics at multiple time intervals (12h, 24h, 48h, 1w), filter by author/pillar/type, search content, sort by engagement. Batch analyze all posts with AI.

### AI Analysis Pipeline
- **Classification**: Each post scored as hit/average/miss against your historical baseline
- **Learning Extraction**: 2-4 insights per post with AI-assessed confidence (0.3–0.95)
- **Confidence Growth**: Re-confirmed insights get boosted over time
- **Playbook Generation**: Auto-generated strategy doc from all learnings, weighted by confidence

### Draft Workshop
Generate AI drafts by specifying topic, pillar, and style. The AI uses your playbook, top 5 performing posts as voice reference, hook library, and pillar-specific hashtags. Generates multiple variants with different hook styles.

### Content Calendar
Monthly calendar view for scheduling posts. Link drafts to dates, track status (planned/ready/posted/skipped). AI suggests next week's content plan based on pillar balance, series schedule, and best posting times.

### Mood Board
Collect inspiration organized by content pillar. Add notes, ideas, quotes, links, or saved posts. Generate AI drafts directly from mood board items.

### Hooks Library
Save and track opening lines by style (question, contrarian, story, stat, cliffhanger, list, statement). Auto-extract hooks from posts. Track usage count and avg engagement per hook.

### Hashtag Sets
Organize hashtags by pillar. Track usage and average reach. Hashtags feed into AI draft generation.

### Content Series
Define recurring content patterns (e.g., weekly series). Set frequency, preferred day/time, and linked pillar.

### Competitors
Track competitor profiles with notes, post counts, and engagement benchmarks.

### Analytics
Deep-dive dashboards: monthly trends, pillar performance, post type comparison, hook style effectiveness (radar chart), content length sweet spot (scatter plot), top/bottom performers with suggestions.

### Goals
Set and track performance targets (e.g., "reach 50K impressions by March").

## Project Structure

```
├── backend/
│   ├── server.py        # FastAPI endpoints
│   ├── analyzer.py      # AI classification + learning extraction
│   ├── drafter.py       # AI draft generation with context gathering
│   ├── prompts.py       # All LLM prompt templates
│   ├── llm.py           # LLM provider abstraction (Google/Anthropic)
│   ├── db.py            # SQLite schema (13 tables)
│   ├── models.py        # Pydantic request/response models
│   └── config.py        # Environment configuration
│
├── frontend/
│   ├── app/linkedin/
│   │   ├── page.tsx              # Dashboard
│   │   ├── posts/page.tsx        # Post library
│   │   ├── drafts/page.tsx       # Draft workshop
│   │   ├── calendar/page.tsx     # Content calendar
│   │   ├── series/page.tsx       # Content series
│   │   ├── mood-board/page.tsx   # Mood board
│   │   ├── hooks-library/page.tsx # Hooks library
│   │   ├── hashtags/page.tsx     # Hashtag sets
│   │   ├── competitors/page.tsx  # Competitor tracking
│   │   ├── analytics/page.tsx    # Deep analytics
│   │   └── components/           # Shared components
│   └── app/api/linkedin/         # API route proxies
│
└── .gitignore
```

## API Endpoints

### Posts & Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | List posts (filter by author, pillar, type, date) |
| POST | `/posts` | Create post |
| GET | `/posts/{id}` | Get post with metrics |
| PUT | `/posts/{id}` | Update post |
| DELETE | `/posts/{id}` | Delete post |
| POST | `/posts/{id}/metrics` | Add metrics snapshot |
| GET | `/posts/batch-metrics` | Batch fetch latest metrics |

### AI & Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze/{id}` | Classify + extract learnings for one post |
| POST | `/analyze/batch` | Batch analyze multiple posts |
| GET | `/learnings` | List all learnings (filter by category, impact) |
| GET | `/playbook` | Get latest playbook |
| POST | `/playbook/regenerate` | Force regenerate playbook |

### Drafts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/drafts/generate` | AI-generate draft variants |
| GET | `/drafts` | List drafts (filter by status) |
| POST | `/drafts` | Create manual draft |
| PUT | `/drafts/{id}` | Update draft |
| POST | `/drafts/{id}/publish` | Convert draft to post |

### Content Organization
| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/pillars` | Content pillars |
| CRUD | `/series` | Content series |
| CRUD | `/mood-board` | Mood board items |
| CRUD | `/hooks` | Hook lines |
| CRUD | `/hashtags` | Hashtag sets |
| CRUD | `/calendar` | Calendar entries |
| CRUD | `/goals` | Performance goals |
| CRUD | `/competitors` | Competitor profiles |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Summary stats |
| GET | `/dashboard/heatmap` | Best posting times |
| GET | `/dashboard/pillar-balance` | Post distribution |
| GET | `/dashboard/analytics` | Full analytics breakdown |
| GET | `/calendar/suggestions` | AI content plan for next week |

## How AI Analysis Works

1. **Baseline**: Calculated from your own posts — average engagement score + median impressions
2. **Classification**: Post engagement compared to baseline (hit >1.5x avg, miss <0.5x avg, average in between). AI confirms with full context.
3. **Learnings**: AI extracts 2-4 insights per post with confidence scores based on evidence strength
4. **Confidence**: Starts at AI-assessed value (0.3–0.95). Grows when the same insight is re-confirmed from another post analysis.
5. **Playbook**: All learnings fed to AI (sorted by confidence), generates DO/DON'T/Best Practices

## How AI Drafts Work

The draft generator gathers 6 inputs:
1. **Your playbook** — the rules to follow
2. **Voice reference** — your top 5 posts by engagement (so it writes like you)
3. **Hook library** — your best-performing opening lines
4. **Hashtag sets** — pillar-specific hashtags
5. **Pillar context** — name and description of the content pillar
6. **Style preference** — tone you specify (or default "professional, engaging")

Outputs multiple variants, each with a different hook style, full body, CTA, and hashtags.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_PROVIDER` | Yes | `google` or `anthropic` |
| `GOOGLE_API_KEY` | If google | Google GenAI API key |
| `ANTHROPIC_API_KEY` | If anthropic | Anthropic API key |
| `HOST` | No | Server host (default: `127.0.0.1`) |
| `PORT` | No | Server port (default: `8200`) |

## License

MIT
