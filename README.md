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

## AI Tool Contract

Streaming chat can call server-side tools against the existing Nest tracker API. Normal text answers still work for questions that do not need a live lookup. Tools never scrape live pages and never invent names, prices, or counts.

| Tool | When to use | Sources |
| --- | --- | --- |
| `getCompetitors` | Competitor name, URL, who is being tracked | `GET /competitors`, `GET /products` |
| `getDashboardSummary` | Counts, overview, price band | `GET /intelligence/dashboard`, `GET /dashboard/summary`, `GET /competitors` |
| `queryCompetitorData` | Current prices, cheapest/most expensive, and snapshot diffs | `GET /competitors`, `GET /products`, `GET /changes/competitor/:id` |

`queryCompetitorData` input (all optional):

| Field | Type | Meaning |
| --- | --- | --- |
| `competitorName` | string | Case-insensitive partial match on competitor name |
| `productName` | string | Case-insensitive partial match on product name |
| `changeType` | `PRICE_INCREASE` \| `PRICE_DECREASE` \| `NEW_PRODUCT` \| `REMOVED_PRODUCT` \| `AVAILABILITY_CHANGE` \| `ALL` | Filter by detected change kind |
| `limit` | integer 1–20 | Max rows to return (default 10) |

`queryCompetitorData` distinguishes **no data** from **data with no changes**:

| `status` | Meaning |
| --- | --- |
| `changes` | Snapshot diffs were found |
| `stable` | Products exist; latest comparison found no diffs |
| `no_products` | A competitor is tracked but nothing has been captured yet |
| `no_competitors` | The workspace has no competitors |
| `no_match` | The name/product filter matched no records |

Zero snapshot diffs with captured products is a successful `stable` result (`hasChanges: false`). The UI says **No price changes detected**, not **No matching competitor data found**.

### Error behavior

If the tracker API is unreachable or every change request fails, the tool throws `Couldn't retrieve competitor data`. The AI SDK marks the tool part as `output-error`. The chat UI stays up, shows a designed error card (no stack traces), and offers **Retry**.

### UI lifecycle states

| State | What the seller sees |
| --- | --- |
| `input-streaming` | Dashed, pulsing “Preparing competitor data query…” — the model is still forming arguments |
| `input-available` | Left navy bar + labeled chips for tool / competitor / product / change type |
| `output-available` | `CompetitorPriceChangeCard` rows (previous/current price, difference, percent) — not raw JSON |
| `output-error` | Rose error card + retry |

States share a 200ms border/background transition so the card morphs instead of jumping.

### Development failure tests

Sabotage query params work **only** when `NODE_ENV` is not `production` (local `npm run dev` / tests). They never run on Vercel production.

Open `/ai-assistant?testError=KIND`:

| `testError` | What it does |
| --- | --- |
| `network` | Client throws before fetch |
| `api` or `500` | Chat route returns HTTP 500 |
| `429` | Chat route returns HTTP 429 |
| `midstream` | Stream starts, then errors |
| `tool` | `queryCompetitorData` throws |
| `empty` | Tool returns no matching rows |

Sabotage applies to the first **submit** only. **Retry** sends `trigger: regenerate-message`, which is not sabotaged, so you can fail the first stream and then recover with Retry while `?testError=` stays in the URL.

### UI lifecycle states

| State | What the seller sees |
| --- | --- |
| `input-streaming` | Dashed, pulsing “Preparing competitor data query…” — the model is still forming arguments |
| `input-available` | Left navy bar + labeled chips for tool / competitor / product / change type |
| `output-available` | `CompetitorPriceChangeCard` rows (previous/current price, difference, percent) — not raw JSON |
| `output-error` | Rose error card + retry |

States share a 200ms border/background transition so the card morphs instead of jumping.

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
