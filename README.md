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

Claude is **not** a chatbot. `GET /intelligence/briefing` builds a fact pack from that user’s captured prices, snapshot diffs, and stored reviews, then asks Claude for structured JSON:

- `headline`, `bullets`, `risks`, `nextActions`
- System prompt: use only supplied facts; never invent prices or products

The prompt lives in `backend/src/intelligence/briefing.ts` (`BRIEFING_SYSTEM_PROMPT` + `buildBriefingUserPrompt`). Default model: Gemini `gemini-3.6-flash` when `GEMINI_API_KEY` is set (free AI Studio key). Claude is used only if Gemini is missing and `ANTHROPIC_API_KEY` is set.

**Fallback:** if no LLM key is set, the call fails, or JSON is invalid, the API returns a rule-based briefing from the same captured findings. The dashboard labels the source (`Gemini briefing` / `Claude briefing` / `Captured-data briefing`) and never fills in fake numbers.

## Known limitations

- Unsupported stores may only get JSON-LD prices, or fail discovery
- Review coverage depends on what the store exposes publicly
- Gemini briefings need `GEMINI_API_KEY` in Railway; without any LLM key you still get the fallback briefing
- Existing data created before per-user workspaces may need a fresh onboarding pass

### Later

- Attach orphan historical data to the first account
- More marketplaces
- Email digest of the weekly briefing

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md). Frontend is on Vercel; API and cron are on Railway.

## Capstone notes

- [docs/REFLECTION.md](./docs/REFLECTION.md)
- [docs/CAPSTONE.md](./docs/CAPSTONE.md) — brief, audit notes, and how to collect Lighthouse / axe evidence
