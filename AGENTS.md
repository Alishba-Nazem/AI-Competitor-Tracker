# AGENTS.md

## Cursor Cloud specific instructions

This is a two-service monorepo for the **Ecommerce Competitor Tracker**:

- `backend/` — NestJS 11 API (port **3000**), Prisma 7 ORM against PostgreSQL, scraping + LLM briefings.
- `frontend/` — Next.js 16 (port **3001**), talks to the backend via `NEXT_PUBLIC_API_BASE_URL`.

Standard commands live in each package's `package.json`; the root `README.md` documents the manual local setup. Prefer those sources over duplicating commands here.

### Node version (non-obvious)

The repo pins **Node 24** (`.nvmrc`, `engines`). The VM's `exec-daemon` injects an older Node (v22) ahead of nvm on `PATH`, so `node` can silently resolve to v22. A one-time `~/.bashrc` snippet prepends the nvm Node 24 bin to `PATH`, so **fresh shells get Node 24 automatically**. If a command unexpectedly runs on Node 22, prepend it manually: `export PATH="$HOME/.nvm/versions/node/v24*/bin:$PATH"`.

### PostgreSQL (must be started each boot)

PostgreSQL 16 is installed with a local dev database already created (role `tracker` / password `tracker`, database `competitor_tracker`). The Postgres service is **not** auto-started on boot — start it before running the backend:

```bash
sudo service postgresql start   # or: sudo pg_ctlcluster 16 main start
```

The database data (and the `tracker` role / `competitor_tracker` DB) persist in the environment snapshot, so you normally do not need to recreate them.

### Environment files (git-ignored, persist in snapshot)

`backend/.env` and `frontend/.env.local` are git-ignored and were created for local dev. If missing on a fresh machine, recreate them:

- `backend/.env`: `DATABASE_URL` and `DIRECT_DATABASE_URL` = `postgresql://tracker:tracker@localhost:5432/competitor_tracker`, plus `PORT=3000`, `FRONTEND_URL=http://localhost:3001`, `JWT_SECRET=<any>`. `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` are **optional** — without them the app returns a rule-based "Captured-data briefing" fallback (no crash).
- `frontend/.env.local`: `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`.

### Running the services (dev)

Start each in its own terminal (see `package.json` scripts):

- Backend: `cd backend && npm run start:dev` (Nest watch mode; serves `GET /` → `Hello World!` and Swagger). Requires Postgres running.
- Frontend: `cd frontend && npm run dev` (Next.js on 3001).

After schema changes, sync the DB with `cd backend && npx prisma db push` (this project has no `prisma/migrations` — it uses `db push`). This needs Postgres running, which is why it is intentionally kept out of the automatic update script.

### Lint / test (non-obvious)

- `npm test` passes in both packages (backend Jest, frontend Vitest). Tests do **not** require a database.
- `npm run lint` currently reports **pre-existing** errors in both packages (backend: `no-unsafe-*` in `test/*.e2e-spec.ts`; frontend: `react-hooks/set-state-in-effect`). These are not caused by environment setup; the lint toolchains themselves run correctly.

### Onboarding / scraping

Completing onboarding triggers live scraping of the competitor store URL, so it needs outbound internet. Shopify stores (e.g. `https://www.allbirds.com`) and Daraz shops work best; a Shopify store yields product discovery via `/products.json`.
