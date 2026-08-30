# V2 evaluation

This file is the evaluation record for the Assignment 8.1 / 8.2 submission. The repository did **not** previously contain a document titled “V2 evaluation.” Numbers below are taken from dated files in the repo or from commands re-run while writing this packet. Different dates are different snapshots. They are not one continuous lab session.

If a required metric is missing, it is marked `TODO`.

## What was evaluated

| Area | What exists | What was measured |
| --- | --- | --- |
| Backend unit/integration | Jest under `backend/src/**/*.spec.ts` | Scrape helpers, onboarding isolation, briefing parse/fallback, review sentiment counting, scheduler failure handling, changes, auth, products |
| Frontend unit/component | Vitest + React Testing Library under `frontend/**/*.test.ts(x)` | Auth forms, dashboard, briefing panel, charts, chat/tool UI, AI tool helpers, 3D viewer fallbacks, motion button |
| Frontend E2E | Playwright `frontend/e2e/ai-analyst.spec.ts` | AI Analyst heading, composer, send, mocked streamed reply |
| Backend E2E | `backend/test/app.e2e-spec.ts`, `backend/test/changes.e2e-spec.ts` | Nest HTTP / changes flows (`npm run test:e2e`) |
| CI | `.github/workflows/frontend-tests.yml` | On every push: `npm run typecheck`, `npm test`, `npm run test:e2e` in `frontend/` |
| Performance / a11y | Lighthouse, axe, WAVE | Dated production homepage / Research / login captures |
| Live deploy | [DEPLOYMENT.md](../DEPLOYMENT.md) | Vercel + Railway signed off 23 Aug 2026 |

Not evaluated in this packet (no verified numbers):

- Production user counts or traffic
- Scrape success rate across a defined store sample
- Frame rate of the 3D viewer on real devices
- Lighthouse on `/products` with the 3D modal open
- A formal “V1 score vs V2 score” spreadsheet

`TODO: Add those measurements if the course requires them.`

## Methodology

1. **Automated tests** — run the scripts in each `package.json`. Backend Jest uses `ts-jest` and `rootDir: src`. Frontend Vitest uses jsdom. Playwright starts the Next app and **mocks** `localhost:3000` plus `POST /api/chat`; it does not scrape a live store.
2. **CI** — GitHub Actions `Frontend tests` job on `ubuntu-latest`, Node 24, `npm ci`, Playwright Chromium.
3. **Lighthouse / axe** — recorded in [CAPSTONE.md](./CAPSTONE.md) (23 Aug 2026) on the live Research page and login, with screenshots in [docs/evidence/](./evidence/).
4. **WAVE / later Lighthouse** — recorded in [../AUDIT.md](../AUDIT.md). Final WAVE numbers are from the **browser extension** on the rendered live homepage (`https://ai-competitor-tracker.vercel.app/`), because the online WAVE URL report did not match that rendered page.

## Test cases (implemented)

Representative cases that exist in code (not an exhaustive list of every `it()`):

- Platform detection: Daraz hostname, Shopify signals, unknown HTML
- JSON-LD and Shopify/Daraz price extraction; no invented price when none is found
- Snapshot diff types: `PRICE_INCREASE`, `PRICE_DECREASE`, new / removed / availability
- Briefing JSON parse; `source: 'fallback'` when the model is unused
- Per-user workspace isolation (second account does not inherit another catalog)
- Scheduler skips when a run is already in progress; failed captures do not crash the cron
- Frontend: labeled fields, dashboard loading/error, briefing panel, sentiment charts, chat empty/stop/thinking, tool result / error cards, 3D WebGL-unavailable fallback, reduced motion
- Playwright: signed-in seller opens `/ai-assistant`, types a question, sees a mocked assistant sentence

## Actual results

### Automated tests — 30 Aug 2026 (this documentation pass)

| Suite | Command | Result |
| --- | --- | --- |
| Backend Jest | `cd backend && npm test` | 29 suites passed, **137 tests passed**. Jest warned that a worker did not exit gracefully (open handles / timers). That warning is not a failed assertion. |
| Frontend Vitest | `cd frontend && npm test` | **23 files passed, 90 tests passed.** Duration ~255s. jsdom logged `HTMLCanvasElement.getContext` “Not implemented” during 3D tests; those tests still passed via the no-WebGL path. |

### Automated tests — 25 Aug 2026 ([CAPSTONE.md](./CAPSTONE.md))

| Suite | Result |
| --- | --- |
| Backend Jest | 29 suites, 137 passed |
| Frontend Vitest | 11 files, 33 passed |

The frontend count grew after chat-tool, CI, and 3D test files were added. Backend count matched the 30 Aug re-run.

### Playwright / backend e2e — this session

`TODO: Record a local Playwright run (`cd frontend && npm run test:e2e`) and a backend e2e run (`cd backend && npm run test:e2e`) if you need pass counts in the packet. CI is configured to run the frontend trio on push; this session did not download Actions logs.`

### Lighthouse and axe — 23 Aug 2026 (CAPSTONE, live Research / login)

| Check | Result |
| --- | --- |
| Lighthouse Performance | 85 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| axe login | 0 issues (Critical / Serious / Moderate / Minor) |
| axe Research dashboard | 0 issues |

Images: `docs/evidence/lighthouse-mobile.png`, `docs/evidence/axe-login.png`, `docs/evidence/axe-dashboard.png`.

### Lighthouse and WAVE — later homepage audit ([AUDIT.md](../AUDIT.md))

Baseline Lighthouse Mobile (author-provided, `screenshots/lighthouse-before.png`): Performance **76**, Accessibility **100**, Best Practices **100**, SEO **100**.

After landmark / title / heading / chat live-region work, Lighthouse Mobile on the deployed homepage (`screenshots/lighthouse-after.png`): Performance **87**, Accessibility **100**, Best Practices **100**, SEO **100**.

WAVE browser extension on the same rendered homepage:

| Metric | Baseline | After |
| --- | ---: | ---: |
| Errors | 2 | 0 |
| Contrast errors | 0 | 0 |
| Alerts | 2 | 0 |
| Features | 0 | 3 |
| Structure | 0 | 8 |
| ARIA | 0 | 12 |
| AIM | 6.7 / 10 | 10 / 10 |

WAVE after message: “Congratulations! No errors were detected!”

These Lighthouse Performance numbers (85 vs 76 vs 87) are from **different dates and possibly different pages** (Research vs homepage). Do not average them or treat 85 → 76 as a regression without a same-page re-run.

`TODO: If the course wants a single “current V2 Lighthouse” number, re-run Lighthouse Mobile on a named URL and date and replace the table above with that one run.`

## Failures and issues that were real

- **Gemini quota** — when the free-tier key is exhausted, Research hides a raw API dump and shows a captured-data / fallback briefing instead ([CAPSTONE.md](./CAPSTONE.md), commit `ec283e2`).
- **WAVE vs SSR** — AuthGate replaced homepage children with “Checking your session…” so the online WAVE URL report missed `<h1>` / `<main>`. The verified fix is a root `<main id="main-content">` and a visible homepage heading during session check ([AUDIT.md](../AUDIT.md), commits `4c64de8`, `31a14f7`, `849aee6`).
- **CI typecheck** — `LayoutProps<"/">` failed `tsc --noEmit`; layout props were typed as `{ children: React.ReactNode }` (`e0c0f30`).
- **Deploy** — several Railway commits were needed for Node 24, listen address, Prisma `db push`, and CORS (`FRONTEND_URL`). Those are operational, not test-score failures.
- **Frontend lint** — the 3D notes in the previous README recorded pre-existing ESLint failures in unrelated files. `TODO: Re-run `cd frontend && npm run lint` and record the current error list if lint is part of the grade.`
- **Jest open handles** — seen on the 30 Aug backend run. Tests still passed.

## Improvements from the earlier version

From git history and dated docs, not from invented KPIs:

- **Data model:** first shipped app used a shared profile; `23d1eee` isolated each account with `userId` and added Gemini briefings.
- **AI surface:** briefing-only → streaming Gemini chat (`e0bec37`) with dashboard tools (`f198bb8`). Tools read stored Nest data only.
- **Honesty under failure:** hide Gemini quota errors; briefing fallback from facts; chat Retry after a sabotaged midstream error in non-production.
- **Verification:** Jest suite already large by 25 Aug; Vitest coverage expanded; Playwright + GitHub Actions added (`7051923`).
- **Accessibility:** WCAG contrast and login JS split (`1075b73`); landmarks, titles, chat `aria-live` (AUDIT commits). WAVE errors 2 → 0 on the verified homepage pass.
- **UI:** review sentiment charts (`e0788f5`); optional 3D preview (`134151c`) code-split so `/products` does not load Three.js until **View in 3D**.

## Remaining weaknesses

- Playwright does not exercise a real scrape or a real Gemini stream.
- No recorded scrape-success dataset (how many Shopify vs Daraz URLs fail).
- Product identity is per stored row, not cross-marketplace matching.
- Two Gemini keys (Railway vs Vercel) can drift; chat and briefing fail independently.
- 3D mesh is a placeholder bottle; live `/products` Lighthouse with the modal open is unmeasured.
- Cron only helps if the Railway process stays running at midnight UTC.
- Jest open-handle warning is unresolved.

`TODO: Add a short scrape-fixture table (store URL, platform, last capture status) if you want operational evidence beyond unit tests.`
