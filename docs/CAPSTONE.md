# Capstone packet

## 1. Project brief

Ecommerce Competitor Tracker helps small online sellers see what rivals charge, when catalogs change, and what customers complain about — using real store pages, not mock prices. It is for shop owners (especially Pakistan-market catalogs on Daraz and Shopify) who cannot check competitor sites every day. I built it because the hard problem is trustworthy capture; Claude then turns those facts into a weekly briefing.

## 2. Live application

- App: https://ai-competitor-tracker.vercel.app
- API: https://ai-competitor-tracker-production.up.railway.app

Create an account, finish the 3-step onboarding, capture a competitor, then read **AI briefing** on Research.

## 3. Repository

https://github.com/Alishba-Nazem/AI-Competitor-Tracker

Setup is in the root [README](../README.md).

## 4. Testing

```bash
cd backend && npm test
cd frontend && npm test
```

Backend covers scrape helpers, onboarding isolation, briefing parse/fallback. Frontend covers `FindingList`, `AuthScreen` (error `role="alert"`), and `BriefingPanel` (loading / error / Claude / empty).

Paste coverage output or a screenshot here after you run `cd backend && npm test -- --coverage` and `cd frontend && npm test`.

## 5. Performance and accessibility

**Concrete fix from audit prep:** added a skip-to-main-content link, labeled the mobile nav as a dialog, and moved dashboard stats behind the signed-in API so the summary is not an unauthenticated 401.

Collect before submit:

1. Chrome DevTools → Lighthouse → **Mobile**. Aim 90+ (pass bar is 85). Save the screenshot to `docs/evidence/lighthouse-mobile.png`.
2. axe DevTools or WAVE on `/login` and `/` (after sign-in). Save to `docs/evidence/axe-login.png` and `docs/evidence/axe-dashboard.png`.
3. Note any remaining issues you fixed in this file.

## 6. Deployment

Filled checklist and rollback: [DEPLOYMENT.md](../DEPLOYMENT.md).

## 7. Reflection

[docs/REFLECTION.md](./REFLECTION.md) — edit the last paragraph in your own voice before you submit.
