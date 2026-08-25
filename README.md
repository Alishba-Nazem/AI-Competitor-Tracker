# Ecommerce Competitor Tracker

Track competitor store prices, catalog changes, and public reviews — then turn captured facts into a short weekly briefing.

**Live app:** [https://ai-competitor-tracker.vercel.app](https://ai-competitor-tracker.vercel.app)  
**API:** [https://ai-competitor-tracker-production.up.railway.app](https://ai-competitor-tracker-production.up.railway.app)  
**Repo:** [https://github.com/Alishba-Nazem/AI-Competitor-Tracker](https://github.com/Alishba-Nazem/AI-Competitor-Tracker)

## Project brief

Small ecommerce sellers cannot sit in rival stores all day. This app is for Pakistan-market shop owners (and similar catalogs) who need a live view of competitor prices, new products, and customer complaints. I chose it because the data has to be scraped from real stores — invented mock prices would make the product useless — and because an LLM only helps after those facts exist.

## Local setup

You need Node 24, PostgreSQL, and two terminals.

```bash
# backend
cd backend
cp .env.example .env          # fill DATABASE_URL, JWT_SECRET, optional GEMINI_API_KEY
npm install
npx prisma generate
npx prisma db push
npm run start:dev             # http://localhost:3000

# frontend
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
# For streaming chat on /ai-assistant, also set GOOGLE_GENERATIVE_AI_API_KEY in .env.local (server-side, not NEXT_PUBLIC_)
npm install
npm run dev                   # http://localhost:3001
```

Open **http://localhost:3001**, create an account, and complete onboarding with real store URLs (Shopify or Daraz work best).

### Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Architecture

| Part | Role |
| --- | --- |
| `frontend/` | Next.js 16 UI: auth, onboarding, research dashboard, competitor workspace |
| `backend/` | NestJS 11 API: auth, scrape, snapshots, reviews, intelligence, cron |
| `backend/prisma/` | Postgres schema. Each `User` owns one `BusinessProfile` and only that user’s competitors |
| Scraper | Discovers products (Shopify / Daraz / JSON-LD fallback), captures current selling price, stores snapshots |
| Reviews | Public reviews only. Themes are keyword-based when an LLM is unavailable |
| Scheduler | Daily / weekly recapture of active competitors |

Each signed-in account is isolated. A new signup always starts with empty onboarding.

## AI integration

There are two Claude/Gemini surfaces, both grounded in stored captures:

1. **Weekly briefing** — `GET /intelligence/briefing` on the Nest API. Builds a fact pack from captured prices, snapshot diffs, and reviews, then asks Gemini (preferred) or Claude for JSON (`headline`, `bullets`, `risks`, `nextActions`). Fallback: rule-based briefing from the same facts. Prompt: `backend/src/intelligence/briefing.ts`.
2. **Streaming chat** — `POST /api/chat` on the Next.js app. Uses the Vercel AI SDK `streamText` + Gemini. The Research page links to **AI Analyst** (`/ai-assistant`). The route loads `/intelligence/dashboard` with the user’s JWT so answers use real captured facts. `GOOGLE_GENERATIVE_AI_API_KEY` stays on the Next.js server (Vercel / `.env.local`), never `NEXT_PUBLIC_`.

**Fallback:** if no LLM key is set, the briefing still returns captured findings. Chat shows a configuration error until `GOOGLE_GENERATIVE_AI_API_KEY` is set for the frontend.

## Known limitations

- Unsupported stores may only get JSON-LD prices, or fail discovery
- Review coverage depends on what the store exposes publicly
- Gemini briefings need `GEMINI_API_KEY` in Railway; without any LLM key you still get the fallback briefing
- Streaming chat needs `GOOGLE_GENERATIVE_AI_API_KEY` on the frontend host (Vercel / `.env.local`); a free key from Google AI Studio is enough
- Existing data created before per-user workspaces may need a fresh onboarding pass

### Later

- Attach orphan historical data to the first account
- More marketplaces
- Email digest of the weekly briefing

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md). Frontend is on Vercel; API and cron are on Railway.

## Capstone notes

- [docs/CAPSTONE.md](./docs/CAPSTONE.md) — brief, live URLs, test counts, Lighthouse / axe evidence
- [docs/REFLECTION.md](./docs/REFLECTION.md)
- [docs/evidence/](./docs/evidence/) — `lighthouse-mobile.png`, `axe-login.png`, `axe-dashboard.png`
