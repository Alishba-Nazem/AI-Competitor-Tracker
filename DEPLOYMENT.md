# Deployment

## Checklist (signed off)

| Item | Status | Notes |
| --- | --- | --- |
| Frontend live on Vercel | Yes | https://ai-competitor-tracker.vercel.app |
| API live on Railway | Yes | https://ai-competitor-tracker-production.up.railway.app |
| `NEXT_PUBLIC_API_BASE_URL` set on Vercel | Yes | Railway API URL, no trailing slash |
| `FRONTEND_URL` set on Railway | Yes | Vercel origin (comma-separated if you add previews) |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | Yes | Postgres (Supabase or Railway plugin) |
| `JWT_SECRET` set in production | Required | Long random string; do not use the local fallback |
| `GEMINI_API_KEY` | Optional | Enables Gemini briefings (preferred; free AI Studio key) |
| `ANTHROPIC_API_KEY` | Optional | Claude fallback; a claude.ai subscription does not fund this |
| CORS is origin-based, not `*` | Yes | See `backend/src/main.ts` |
| Prisma schema applied | Yes | `prisma db push` on Railway predeploy |
| Health / listen address | Yes | Nest listens on `0.0.0.0` + `PORT` |

Operator: Alishba · Date: 2026-08-23

## How it fails safely

- **API unreachable:** frontend shows the fetch error; no invented catalog is rendered.
- **Scrape fails:** capture log is `failed` / `partial`; previous snapshot stays.
- **Claude down or missing key:** `GET /intelligence/briefing` returns `source: "fallback"` from stored facts.
- **Bad token:** `401` and the UI sends the user to `/login`.
- **Cross-account access:** competitor / product routes 404 if they are not in the signed-in user’s profile.

## Rollback

1. **Frontend:** Vercel → Deployments → previous successful production deploy → Promote / Redeploy.
2. **Backend:** Railway → Deployments → previous successful deploy → Redeploy.
3. **Schema:** only additive Prisma fields were added (`BusinessProfile.userId`). Do not run destructive reset on production.

## Monitoring (lightweight)

- Railway deploy logs + restart on crash
- Vercel deploy status
- Manual smoke after each deploy: sign in, open Research, confirm briefing panel and one competitor workspace load

## Env reference

**Vercel (frontend)**

```
NEXT_PUBLIC_API_BASE_URL=https://ai-competitor-tracker-production.up.railway.app
```

**Railway (backend)**

```
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...
FRONTEND_URL=https://ai-competitor-tracker.vercel.app
JWT_SECRET=...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
PORT=3000
```
