# Accessibility and Lighthouse Audit

## Overview

This document records a Lighthouse Mobile and WAVE audit of Ecommerce Competitor Tracker, the accessibility issues found, and the code changes made to address them.

The public entry page for an unsigned-in visitor is **Sign in**. The signed-in workspace uses a shared shell (header, primary navigation, main, footer). Streaming chat lives on **AI Competitor Analyst** (`/ai-assistant`).

Before/after Lighthouse screenshots are in `screenshots/lighthouse-before.png` and `screenshots/lighthouse-after.png`.

Final WAVE numbers below come from the **WAVE browser extension** on the deployed, rendered homepage (`https://ai-competitor-tracker.vercel.app/`). The online WAVE URL report did not reflect the same rendered page, so it was not used as the verified result.

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

- No performance rewrite. The app already uses `next/font` for IBM Plex Sans. No oversized decorative images were found on the audited auth/workspace chrome.
- A later Lighthouse Mobile re-run on the deployed homepage scored **87** (see Final Lighthouse Results). That measurement is recorded as-is; it was not the result of a dedicated performance project.

## Final Lighthouse Results

Source: Lighthouse Mobile on the deployed homepage, captured in `screenshots/lighthouse-after.png`.

| Category | Score |
| --- | ---: |
| Performance | 87 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

After screenshot:

`screenshots/lighthouse-after.png`

## Final WAVE Results

Source: WAVE **browser extension** on the deployed, rendered homepage (`https://ai-competitor-tracker.vercel.app/`). The online WAVE URL checker did not match this rendered page, so these counts are from the extension only.

WAVE message: **Congratulations! No errors were detected!**

| Metric | Count |
| --- | ---: |
| Errors | 0 |
| Contrast Errors | 0 |
| Alerts | 0 |
| Features | 3 |
| Structure | 8 |
| ARIA | 12 |
| AIM Score | 10 / 10 |

## Before/After Comparison

| Item | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Lighthouse Performance | 76 | 87 | +11 |
| Lighthouse Accessibility | 100 | 100 | 0 |
| Lighthouse Best Practices | 100 | 100 | 0 |
| Lighthouse SEO | 100 | 100 | 0 |
| WAVE Errors | 2 | 0 | −2 |
| WAVE Contrast Errors | 0 | 0 | 0 |
| WAVE Alerts | 2 | 0 | −2 |
| WAVE Features | 0 | 3 | +3 |
| WAVE Structure | 0 | 8 | +8 |
| WAVE ARIA | 0 | 12 | +12 |
| WAVE AIM | 6.7 / 10 | 10 / 10 | +3.3 |

Other qualitative changes:

| Item | Before | After |
| --- | --- | --- |
| Document title | Short or default-only on some routes | Descriptive titles on sign-in, sign-up, and Research |
| `html lang` | Already `en` in source | Unchanged (`en`) |
| Headings | Form `h1`; marketing copy was a `<p>`; homepage session-check had no `<h1>` | Marketing copy is `<h2>`; homepage exposes a visible **Competitor research** `<h1>` |
| Landmarks | Incomplete (`main` only on auth; no footer; homepage `<main>` easy to miss in the document) | Root `<main id="main-content">`; `header`, `nav`, and `footer` on auth and workspace |
| Chat live region | Thinking only | Thinking + streaming assistant text |
| WAVE verification | Baseline WAVE report | Browser extension on the live rendered homepage (not the online URL report) |

## Conclusion

Baseline Lighthouse Mobile was already strong on Accessibility, Best Practices, and SEO (all 100), with Performance at 76. WAVE still reported a missing/uninformative title, missing/invalid language, no heading structure, and no page regions (AIM 6.7 / 10).

After the landmark, title, heading, and chat live-region work, the WAVE browser extension on the deployed homepage reported **0 errors, 0 contrast errors, 0 alerts**, Features 3, Structure 8, ARIA 12, and **AIM 10 / 10**, with the message “Congratulations! No errors were detected!” Lighthouse Mobile on the same deployed homepage is **87 / 100 / 100 / 100**.

The online WAVE URL report was not used as the final result because it did not reflect the same rendered homepage as the browser extension.
