# AI Competitor Price & Product Change Tracker

**Live app:** [https://ai-competitor-tracker.vercel.app](https://ai-competitor-tracker.vercel.app)  
**API:** [https://ai-competitor-tracker-production.up.railway.app](https://ai-competitor-tracker-production.up.railway.app)  
**Repository:** [https://github.com/Alishba-Nazem/AI-Competitor-Tracker](https://github.com/Alishba-Nazem/AI-Competitor-Tracker)

## Overview

This application helps small ecommerce sellers watch competitor stores without checking those sites by hand every day. A seller signs in, describes their own shop, and adds competitor store URLs. The backend discovers products from those pages, captures current selling prices and public reviews, stores snapshots, and compares new captures with previous ones.

The problem it solves is **trustworthy competitor monitoring**. Invented or mocked prices would make a dashboard look finished and still be useless for a real shop. The product is designed for Pakistan-market sellers (and similar catalogs) who sell alongside Shopify and Daraz stores and need a live view of rival prices, catalog changes, and customer complaints.

Competitor monitoring is useful for small ecommerce businesses because they rarely have a pricing team. A price cut, a new listing, or a repeated shipping complaint on a rival store can change what a seller should do this week. This app turns those captured facts into a research dashboard, a short AI briefing, and a grounded chat assistant.

## Core features

Only features implemented in this repository:

- **Accounts and workspaces** — signup, login, JWT auth. Each user owns one business profile and only that user’s competitors.
- **Onboarding** — three steps: store details, competitor URLs, then automatic product discovery.
- **Competitor tracking** — add, list, and open a per-competitor workspace.
- **Product discovery** — products are found from the competitor store or seller URL (Shopify, Daraz, or JSON-LD fallback). Sellers do not type product prices by hand.
- **Price monitoring** — manual **Capture prices** / **Capture Now**, plus a daily UTC cron for active competitors (`DAILY` or `WEEKLY`).
- **Catalog change detection** — compares the latest snapshot with the previous one: price increase/decrease, new product, removed product, availability change.
- **Public reviews** — scrape and store public reviews; theme keywords are used when no LLM is available.
- **Research dashboard** — competitor / product / change / review counts, AI briefing, findings, review sentiment charts, market gaps.
- **Historical comparison** — snapshots, snapshot products, product price history, and a Changes page with filters.
- **AI briefing** — `GET /intelligence/briefing` builds a fact pack from stored data, then Gemini (preferred), Claude (if Gemini is unset), or a rule-based fallback.
- **AI Analyst** — streaming Gemini chat at `/ai-assistant` with tools that read the Nest tracker API. Tools do not scrape live pages and do not invent prices.
- **3D product preview** — optional **View in 3D** modal on `/products` (procedural placeholder mesh; scraped photo is the fallback).
- **Motion demo** — unauthenticated `/motion-demo` page for a Framer Motion lifecycle button (course assignment, not part of the seller workflow).

## Tech stack

### Frontend

- Next.js 16.3, React 19, TypeScript
- Tailwind CSS 4
- Framer Motion
- Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`)
- Zod
- Three.js, React Three Fiber, Drei (lazy-loaded 3D viewer)
- Vitest, React Testing Library, Playwright

### Backend

- NestJS 11
- Prisma 7
- class-validator / class-transformer
- bcryptjs + jsonwebtoken
- `@nestjs/schedule` (midnight UTC cron)
- Jest + Supertest

### Database

- PostgreSQL
- Prisma schema in `backend/prisma/schema.prisma`

### AI

- Google Gemini — Nest briefings (`GEMINI_API_KEY`) and Next.js streaming chat (`GOOGLE_GENERATIVE_AI_API_KEY`)
- Anthropic Claude — optional briefing fallback (`ANTHROPIC_API_KEY`)
- Rule-based briefing from the same fact pack when no LLM key is set

### Scraping / data collection

- Cheerio (HTML parse)
- Playwright (browser fetch where needed)
- Platform detectors for Shopify and Daraz, plus JSON-LD product extraction

### Deployment

- Frontend: Vercel
- API and cron: Railway
- Postgres: Railway plugin or another hosted Postgres (see [DEPLOYMENT.md](./DEPLOYMENT.md))

### Other tools

- Node 24 (`engines` in root and backend `package.json`)
- GitHub Actions workflow `.github/workflows/frontend-tests.yml` (typecheck, Vitest, Playwright on push)
- ESLint, Prettier

## Architecture

```mermaid
flowchart TD
  Seller[Seller browser]
  Next[Next.js frontend]
  Chat["POST /api/chat Gemini stream + tools"]
  Nest[NestJS API]
  Scrape[Cheerio / Playwright scraper]
  DB[(PostgreSQL)]
  Detect[Snapshot change detection]
  Brief[Intelligence briefing]
  UI[Research dashboard / AI Analyst]

  Seller --> Next
  Next --> Nest
  Next --> Chat
  Chat --> Nest
  Nest --> Scrape
  Nest --> DB
  Nest --> Detect
  Detect --> DB
  Nest --> Brief
  Brief --> Next
  Next --> UI
```

Change detection runs in Nest against stored snapshots **before** any model sees the data. Briefings and chat consume structured facts and diffs; they do not compute raw database differences themselves.

Deeper diagrams and design notes: [docs/architecture.md](./docs/architecture.md).

## How it works

1. The seller creates an account and completes onboarding (store name, niche, competitor URLs).
2. The backend discovers products from each competitor URL and stores them on that user’s profile.
3. **Capture prices** (manual or midnight UTC cron) writes a snapshot of name, URL, price, currency, and availability.
4. A second capture is compared with the previous snapshot. Price, availability, new, and removed products become typed change records.
5. Public reviews can be captured and stored; ratings feed the dashboard charts.
6. The intelligence layer builds a fact pack (counts, findings, price band, review themes). Gemini or Claude may rewrite that pack into a short briefing; otherwise a fallback briefing is built from the same facts.
7. The Research dashboard shows counts, briefing, findings, sentiment, and competitors. The AI Analyst streams answers using the seller’s JWT and tracker tools (`getCompetitors`, `getDashboardSummary`, `queryCompetitorData`).

## Setup

A stranger should be able to run this from a fresh clone. Frontend and backend are **separate** Node packages. There is no root `npm start`.

### Prerequisites

- Node.js **24**
- npm
- PostgreSQL (local or hosted)
- Two terminals
- Optional: a Google AI Studio key for briefings and/or streaming chat; optional Anthropic key for briefing fallback

### Clone

```bash
git clone https://github.com/Alishba-Nazem/AI-Competitor-Tracker.git
cd AI-Competitor-Tracker
```

### Backend

```bash
cd backend
cp .env.example .env
```

Fill `DATABASE_URL` (and optionally `DIRECT_DATABASE_URL`) with a `postgresql://` URL — not a `prisma://` Accelerate URL. Set `JWT_SECRET` to a long random string. Set `FRONTEND_URL=http://localhost:3001`. Optional: `GEMINI_API_KEY` and/or `ANTHROPIC_API_KEY`.

```bash
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

API: **http://localhost:3000**

### Frontend

```bash
cd frontend
cp .env.example .env.local
```

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`. For `/ai-assistant`, also set `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` (server-side only — never `NEXT_PUBLIC_`).

```bash
npm install
npm run dev
```

UI: **http://localhost:3001**

Open that URL, create an account, and complete onboarding with real Shopify or Daraz store URLs. Motion assignment (no sign-in): **http://localhost:3001/motion-demo**

### Build commands

```bash
# backend production build (also runs prisma generate)
cd backend
npm run build
npm run start:prod

# frontend production build
cd frontend
npm run build
npm start
```

`frontend` `npm start` is `next start` (default port 3000). For local production-like serving beside the API, set `PORT=3001` or pass `-p 3001` so it does not collide with Nest.

### Tests

```bash
cd backend && npm test
cd backend && npm run test:e2e
cd frontend && npm test
cd frontend && npm run typecheck
cd frontend && npm run test:e2e
```

### Deployment notes

Frontend is deployed on Vercel; the API and cron run on Railway. Prisma schema is applied with `prisma db push` on Railway predeploy (`npm run railway:predeploy`). Full operator checklist: [DEPLOYMENT.md](./DEPLOYMENT.md).

## Environment variables

Never commit real secrets. Use placeholders only.

### Frontend (`frontend/.env.local`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Browser and Next.js server base URL for the Nest API. Local: `http://localhost:3000`. No trailing slash. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Server-only Gemini key for `POST /api/chat`. Example: `YOUR_API_KEY`. Do not use a `NEXT_PUBLIC_` prefix. |
| `GOOGLE_GENERATIVE_AI_MODEL` | Optional. Defaults to `gemini-3.6-flash`. |

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Direct Postgres URL for Prisma Client. Example: `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require` |
| `DIRECT_DATABASE_URL` | Optional alias preferred by `prisma.config.ts` for `generate` / `db push`. |
| `PORT` | Nest listen port. Local default `3000`. Railway injects this. |
| `FRONTEND_URL` | Comma-separated allowed CORS origins. Local: `http://localhost:3001`. |
| `JWT_SECRET` | Signs login/signup tokens. Use a long random value in production. |
| `GEMINI_API_KEY` | Optional. Preferred key for Nest dashboard briefings. Example: `YOUR_API_KEY` |
| `GEMINI_MODEL` | Optional briefing model override. Defaults to `gemini-3.6-flash`. |
| `ANTHROPIC_API_KEY` | Optional Claude briefing fallback. A claude.ai subscription does not fund this key. |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-3-5-haiku-20241022`. |

Railway `GEMINI_API_KEY` and Vercel `GOOGLE_GENERATIVE_AI_API_KEY` are **separate**. Chat does not read the Railway briefing key.

## Usage example

1. Open the app (local `http://localhost:3001` or the live Vercel URL).
2. Create an account and sign in.
3. Onboarding step 1: enter your store name, optional store URL, and a niche (for example Bags).
4. Step 2: add a real competitor, such as a Daraz seller or a Shopify store URL.
5. Finish onboarding so the API can discover products from that URL.
6. Open **Research**. You should see competitor / product counts once discovery succeeds.
7. Open the competitor workspace → **Discover products** if the catalog is empty → **Capture prices**.
8. Capture again later (or after a known price change) so snapshot diffs can appear under **What changed** and **Changes**.
9. Optionally capture public reviews, then read the sentiment charts on Research.
10. Read **AI briefing** on Research (Gemini/Claude or fallback facts).
11. Open **AI Analyst** and ask a question such as “Which tracked product changed price?” The model may call `queryCompetitorData` and render price-change cards from stored diffs.

## V2 Evaluation Results

Dated, verified evidence from this repository and a re-run of unit/component tests on 30 Aug 2026. There was no earlier document titled “V2 evaluation”; this section compiles existing measurements. Do not treat scores from different dates as one continuous lab run.

**Automated tests (30 Aug 2026, this documentation pass)**

| Suite | Command | Result |
| --- | --- | --- |
| Backend Jest | `cd backend && npm test` | 29 suites, **137 passed** |
| Frontend Vitest | `cd frontend && npm test` | 23 files, **90 passed** |

**Earlier packet (25 Aug 2026, [docs/CAPSTONE.md](./docs/CAPSTONE.md))** — Backend Jest already 29 / 137. Frontend Vitest was then 11 files / 33 passed (before later component, chat, and 3D tests).

**Lighthouse / axe (23 Aug 2026, mobile, live Research page — CAPSTONE)**

| Check | Result |
| --- | --- |
| Performance | 85 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| axe `/login` | 0 issues |
| axe Research dashboard | 0 issues |

Screenshots: [docs/evidence/](./docs/evidence/).

**Lighthouse / WAVE (later homepage audit — [AUDIT.md](./AUDIT.md))**

| Check | Baseline | After |
| --- | ---: | ---: |
| Lighthouse Performance | 76 | 87 |
| Lighthouse Accessibility | 100 | 100 |
| Lighthouse Best Practices | 100 | 100 |
| Lighthouse SEO | 100 | 100 |
| WAVE errors | 2 | 0 |
| WAVE contrast | 0 | 0 |
| WAVE alerts | 2 | 0 |
| WAVE AIM | 6.7 / 10 | 10 / 10 |

After screenshots: `screenshots/lighthouse-after.png`. Final WAVE counts are from the **WAVE browser extension** on the rendered live homepage, not the online URL-only report.

**Playwright / backend e2e this session:** not re-run here. Specs exist (`frontend/e2e/ai-analyst.spec.ts`, `backend/test/*.e2e-spec.ts`). CI is configured to run frontend typecheck, Vitest, and Playwright on push.

Full write-up: [docs/v2-evaluation.md](./docs/v2-evaluation.md).

`TODO: Attach latest Playwright and backend e2e run logs if you need them in the submission packet.`

## Limitations

- Store HTML and JSON-LD change. Shopify / Daraz selectors and fallbacks need maintenance; unsupported stores may discover nothing or only a JSON-LD price.
- Scrapes can fail or finish `partial`. A failed capture keeps the previous snapshot; it does not invent a price.
- Review coverage depends on what the store exposes publicly.
- Gemini free-tier quota can be exhausted. Briefings then use stored-fact fallback (or Claude if that key is set). Chat needs `GOOGLE_GENERATIVE_AI_API_KEY` on the Next.js host or it shows a configuration error.
- AI text can mis-summarize; sellers should verify against the captured table before changing their own prices.
- Products are matched across snapshots by stored `productId`, not fuzzy cross-store matching. A new URL can become a new product row.
- Data created before per-user workspaces may need a fresh onboarding pass.
- Live hosting depends on Vercel, Railway, and the Postgres instance staying up and correctly env-configured.
- The 3D viewer is a small procedural bottle mesh, not a licensed model of the scraped product.
- Playwright E2E mocks the Nest API and the chat stream; it does not prove a live scrape.

## Future improvements

Realistic V3 ideas given the current architecture:

- Email or digest of the weekly briefing
- More marketplaces beyond Shopify / Daraz / JSON-LD
- Attach orphan historical rows created before `userId` isolation
- Stronger product matching across stores (SKU / normalized title)
- License-cleared GLB models instead of the procedural 3D placeholder
- Persist 3D color/material per product
- Re-measure Lighthouse on `/products` with the 3D modal open
- Production-safe alerting when cron captures fail

## AI Transparency

I used AI tools including Claude and ChatGPT during development for code assistance, debugging, architecture discussions, documentation, and refinement. I reviewed the generated suggestions, tested the implementation, made the final technical decisions, and verified the application's behavior myself.

## Demo

- **Live Application:** [https://ai-competitor-tracker.vercel.app/](https://ai-competitor-tracker.vercel.app/)
- **Demo Video:** [https://www.loom.com/share/2158c3245a4b48298bdb247f02dcfdb3](https://www.loom.com/share/2158c3245a4b48298bdb247f02dcfdb3)

Live walkthrough script (no slides): [docs/demo-script.md](./docs/demo-script.md).

## More documentation

| Document | Purpose |
| --- | --- |
| [docs/architecture.md](./docs/architecture.md) | Architecture and design decisions |
| [docs/v2-evaluation.md](./docs/v2-evaluation.md) | Evaluation evidence |
| [docs/demo-script.md](./docs/demo-script.md) | 3–5 minute live demo script |
| [docs/retrospective.md](./docs/retrospective.md) | Final retrospective |
| [docs/submission-index.md](./docs/submission-index.md) | Assignment 8.1 / 8.2 index |
| [docs/final-checklist.md](./docs/final-checklist.md) | Submission checklist |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production env and rollback |
| [docs/CAPSTONE.md](./docs/CAPSTONE.md) | Earlier capstone packet (23–25 Aug 2026) |
| [AUDIT.md](./AUDIT.md) | Lighthouse / WAVE audit notes |
