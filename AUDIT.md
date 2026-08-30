# Accessibility and Lighthouse Audit

## Overview

This document records a Lighthouse Mobile and WAVE audit of Ecommerce Competitor Tracker, the accessibility issues found, and the code changes made to address them.

The public entry page for an unsigned-in visitor is **Sign in**. The signed-in workspace uses a shared shell (header, primary navigation, main, footer). Streaming chat lives on **AI Competitor Analyst** (`/ai-assistant`).

Before/after Lighthouse screenshots belong in `screenshots/`. Place the baseline capture at `screenshots/lighthouse-before.png`. Do not add a fabricated after screenshot.

Final Lighthouse and WAVE scores are **not** filled in here until those tools are run again on the updated pages.

## Baseline Lighthouse Results

Source: Lighthouse Mobile, provided by the project author.

| Category | Score |
| --- | ---: |
| Performance | 76 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

Before screenshot (place the real capture here):

`screenshots/lighthouse-before.png`

## Baseline WAVE Results

Source: WAVE audit, provided by the project author.

| Metric | Count |
| --- | ---: |
| Errors | 2 |
| Contrast Errors | 0 |
| Alerts | 2 |
| Features | 0 |
| Structure | 0 |
| ARIA | 0 |
| AIM Score | 6.7 / 10 |

### WAVE errors

1. **Missing or uninformative page title** — the document `<title>` was missing, generic, or not clearly describing the page.
2. **Language missing or invalid** — the root document language was missing or not a valid `lang` value.

### WAVE alerts

1. **No heading structure** — WAVE did not find a meaningful heading outline.
2. **No page regions** — WAVE did not find landmark regions such as `header`, `nav`, `main`, or `footer`.

## Accessibility/Keyboard Audit

Reviewed the sign-in / sign-up screens, workspace shell, research dashboard, and AI Analyst chat.

| Check | Finding |
| --- | --- |
| Semantic HTML | Auth and workspace used headings and some landmarks, but auth wrapped the whole screen in a single `main` and used a styled paragraph for the marketing headline. Workspace sidebar branding was a `div`, not `header`. No `footer` landmark. |
| Page title | Root metadata existed (`Ecommerce Competitor Tracker`). Login/signup used short titles (`Sign in`, `Create account`) that rely on the template. Research (`/`) had no page-level `metadata`. |
| Document language | Root layout already sets `<html lang="en">`. Kept as-is. |
| Buttons and inputs | Login/signup fields use `Field` labels. Chat composer has a visually hidden label. Stop already had `aria-label="Stop generating"`. |
| Images | Product photos use the product name as `alt`. Decorative dots/icons are `aria-hidden`. |
| Keyboard | Chat composer, Send, Stop, suggested prompts, and skip links are native controls. Conversation pane is focusable. |
| Focus visibility | `input`, `select`, `button`, and `a` had `:focus-visible` outlines. `textarea` and `[tabindex="0"]` did not. |
| Headings | Auth `h1` is the form title. Dashboard and AI Analyst already use `h1` / `h2`. Marketing hero on sign-in was a large `<p>`, not a heading. |
| Landmarks | Workspace: skip link, `nav` (Primary), mobile `header`, `main`. Auth: skip link and a wrapping `main` only. No `footer`. |
| Color contrast | WAVE reported 0 contrast errors. Existing Lighthouse accessibility score was 100. No contrast restyle was made. |
| Forms | Auth forms use labeled fields and `role="alert"` for errors. Chat submit is a real `<form>`. |
| Streamed AI output | Pending/thinking used `role="status"` + `aria-live="polite"`. Tokens in the assistant bubble were not in a live region. |

## Issues Found

1. WAVE: missing or uninformative page title on the audited page.
2. WAVE: document language must be explicit and valid (`lang="en"`).
3. WAVE: no heading structure (or a structure WAVE could not see).
4. WAVE: no page regions (`header` / `nav` / `main` / `footer`).
5. Chat: streamed assistant text was not announced to assistive tech.
6. Chat: the composer `textarea` and the conversation region lacked the same visible focus ring as other controls.
7. Research route had no dedicated document title (fell back to the default only).

## Changes Made

### Page title

- Login title is now the absolute string `Sign in · Ecommerce Competitor Tracker`.
- Signup title is now `Create account · Ecommerce Competitor Tracker`.
- Research (`/`) exports `title: "Research"` so the tab reads `Research · Ecommerce Competitor Tracker`.
- Root default title remains `Ecommerce Competitor Tracker`. Root `<html lang="en">` is unchanged.

### Language

- Confirmed `frontend/app/layout.tsx` renders `<html lang="en">`. No other language attribute was added.

### Heading structure

- Auth marketing headline is an `<h2>` (page `<h1>` remains the form title: “Welcome back” / “Create your workspace”).
- Existing workspace `h1`/`h2` outlines (Research, AI Analyst, section heads) were left in place.
- No visually hidden or decorative-only headings were added.

### Page regions

- Auth: skip link stays; `header` (brand), `main#main-content` (form), `footer` with `nav aria-label="Account"` for the existing sign-in / create-account link. Desktop panel uses `header` / `h2` / `footer` for the same copy as before.
- Workspace: sidebar brand is a `header`; primary `nav` unchanged; `main` unchanged; added a quiet `footer` under main (and under onboarding main).
- Motion demo: existing `main` + `h1` / `h2`; added a short `footer` under the demo.

### AI Analyst / chat

- Conversation pane is `role="region"` with the existing accessible name “Conversation”.
- While a reply is streaming, the latest assistant bubble wraps content in `aria-live="polite"` (`aria-atomic="false"`) so new tokens can be announced without duplicating the thinking status.
- Thinking / pending still uses `role="status"` + `aria-live="polite"`.
- Stop remains a native button with `aria-label="Stop generating"` (keyboard reachable, visible label “Stop”).
- Composer still uses `<label for="ai-chat-input">`. Send remains a named submit button.
- Focus outline extended to `textarea` and `[tabindex="0"]` so the composer and conversation region match other controls.

### Performance

- No performance rewrite. The app already uses `next/font` for IBM Plex Sans. No oversized decorative images were found on the audited auth/workspace chrome. Lighthouse Performance remains the baseline **76** until re-measured.

## Final Lighthouse Results

Not re-run after these changes. Do not treat the baseline numbers as after scores.

| Category | Score |
| --- | ---: |
| Performance | _Pending re-run_ |
| Accessibility | _Pending re-run_ |
| Best Practices | _Pending re-run_ |
| SEO | _Pending re-run_ |

After screenshot (optional, add only a real capture):

`screenshots/lighthouse-after.png`

## Final WAVE Results

Not re-run after these changes.

| Metric | Count |
| --- | ---: |
| Errors | _Pending re-run_ |
| Contrast Errors | _Pending re-run_ |
| Alerts | _Pending re-run_ |
| Features | _Pending re-run_ |
| Structure | _Pending re-run_ |
| ARIA | _Pending re-run_ |
| AIM Score | _Pending re-run_ |

## Before/After Comparison

| Item | Before | After |
| --- | --- | --- |
| Lighthouse Performance | 76 | Not re-measured |
| Lighthouse Accessibility | 100 | Not re-measured |
| Lighthouse Best Practices | 100 | Not re-measured |
| Lighthouse SEO | 100 | Not re-measured |
| WAVE Errors | 2 (title, language) | Code fixes applied; WAVE not re-run |
| WAVE Contrast Errors | 0 | Not re-measured |
| WAVE Alerts | 2 (headings, regions) | Code fixes applied; WAVE not re-run |
| WAVE AIM | 6.7 / 10 | Not re-measured |
| Document title | Short or default-only on some routes | Descriptive titles on sign-in, sign-up, and Research |
| `html lang` | Already `en` in source | Unchanged (`en`) |
| Headings | Form `h1`; marketing copy was a `<p>` | Marketing copy is `<h2>` |
| Landmarks | Incomplete (`main` only on auth; no footer) | `header`, `nav`, `main`, `footer` on auth and workspace |
| Chat live region | Thinking only | Thinking + streaming assistant text |

## Conclusion

Baseline Lighthouse Mobile was already strong on Accessibility, Best Practices, and SEO (all 100), with Performance at 76. WAVE still reported a missing/uninformative title, missing/invalid language, no heading structure, and no page regions.

The code now uses explicit document titles, keeps `lang="en"`, maps existing copy to a real heading outline, and exposes header / nav / main / footer landmarks without changing the visual design. AI Analyst streaming output is announced politely; Stop and the composer stay keyboard-operable with visible focus.

Re-run Lighthouse Mobile and WAVE on the same URL, save real screenshots under `screenshots/`, and replace the pending final-score rows in this file. Until that happens, this audit does not claim improved numeric scores.
