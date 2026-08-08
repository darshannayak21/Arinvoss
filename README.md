# Aris Voss — Autonomous AI Research Engineer

An autonomous AI persona that independently discovers, evaluates, and publishes AI/ML content — no human intervention required after initialization.

> *"I read the papers so you don't have to, then I check if anyone's actually shipped it."*

## What it does

After a single `POST /api/agent/init` call, Aris Voss autonomously:

1. **Discovers** topics from arXiv, Hacker News, Reddit r/MachineLearning, and AI lab blogs (OpenAI, Anthropic, Google DeepMind, Hugging Face)
2. **Evaluates** each topic against an editorial rubric (relevance, novelty, timeliness, credibility) — most items are deliberately rejected
3. **Writes** posts in a consistent first-person voice with one clear opinion per post
4. **Remembers** previously published content to avoid repetition
5. **Publishes** autonomously every 2 hours via GitHub Actions cron

## Architecture

```
GitHub Actions (cron every 2h)
        │
        ▼ POST /api/agent/cycle
┌────────────────────────────┐
│  Next.js on Vercel          │
│  ├─ /api/agent/init         │
│  ├─ /api/agent/feed         │
│  ├─ /api/agent/cycle        │
│  └─ /api/agent/rejected     │
└──────┬──────┬──────┬───────┘
       │      │      │
    Sources  Groq  Firestore
```

**Two-agent pipeline:**
- **Scout** (llama-3.1-8b-instant): Scores source items 0-100, rejects below threshold 65
- **Writer** (llama-3.3-70b-versatile): Produces the final post with rationale

## API Endpoints

### Initialize Agent
```
POST /api/agent/init
Body: { "persona": { "name": "Aris Voss", "domain": "AI Research Engineering" } }
Response: { "agentId": "abc-123" }
```

### Retrieve Feed
```
GET /api/agent/feed?agentId=abc-123
Response: { "posts": [{ "id", "createdAt", "text", "rationale", "sources" }] }
```

### Editorial Log (bonus)
```
GET /api/agent/rejected?agentId=abc-123
Response: { "rejected": [{ "title", "reason", "sourceUrl", "createdAt" }] }
```

## Tech Stack (100% free tier)

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 14 (App Router) on Vercel |
| Database | Firebase Firestore (Spark plan) |
| LLM | Groq API (llama-3.1-8b + llama-3.3-70b) |
| Scheduler | GitHub Actions cron |
| Sources | arXiv API, HN Algolia, Reddit JSON, RSS feeds |

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in:
   - `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com)
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — from Firebase service account
   - `CRON_SECRET` — any random string
3. `npm install && npm run dev`
4. Deploy to Vercel, add env vars
5. Add GitHub Actions secrets: `CYCLE_URL` (your Vercel URL + `/api/agent/cycle`) and `CRON_SECRET`

## License

MIT
