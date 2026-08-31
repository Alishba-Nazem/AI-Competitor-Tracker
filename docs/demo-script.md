# Demo script (3–5 minutes, no slides)

Speak from the **live app** or local `http://localhost:3001` with the API running. Prefer a workspace that already has at least one Shopify or Daraz competitor, two price captures, and some reviews so the dashboard is not empty. If Gemini quota is exhausted, say so and show the fallback briefing — do not pretend the model answered.

Do **not** demo `/motion-demo` unless a reviewer asks; it is a course motion page, not the seller product.

---

### 0:00–0:30 — Introduction

“This is **AI Competitor Price & Product Change Tracker**. Small ecommerce sellers cannot sit in rival stores all day. The app is for shop owners — especially people selling against Daraz and Shopify catalogs — who need current competitor prices, catalog changes, and public reviews. I scrape real store pages, store snapshots, then let AI summarize only those stored facts.”

---

### 0:30–1:30 — Live dashboard

Sign in if needed. Land on **Research** (`/`).

Point at what is on screen:

1. **Stat cards** — Competitors, Products, Changes this week, Reviews. These are counts from the signed-in workspace, not demo fixtures.
2. **AI briefing** — headline, bullets, risks, next actions. Say whether the panel shows Gemini, Claude, or the captured-data fallback (`source` in the API). If it is fallback, say the facts are still from the database.
3. **What changed** — price increases/decreases and new products from snapshot diffs. If empty: “This list stays empty until we capture prices at least twice.”
4. **How customers rate competitors** — donut / star spread from **stored** ratings. Unrated reviews are not counted as likes.
5. **Market gaps** and the competitor list.

“Nothing on this page is a live scrape happening as I talk. It is the last successful capture plus the diffs we already computed.”

---

### 1:30–2:30 — End-to-end workflow

Do one real path. Pick A or B depending on whether the account is already onboarded.

**A — Existing competitor (preferred for a short demo)**

1. Open **Competitors**, then one store.
2. Click **Discover products** if the catalog is thin; wait for the real count.
3. Click **Capture prices**. Wait until the UI reports how many prices were captured (and any failures).
4. Open **Changes**. Filter **All** vs price increase/decrease. Explain: a price row only appears when two snapshots disagree on the selling price.
5. Optional, if time: **Products** → **Capture Now** on one row, or **View in 3D** and say it is a placeholder mesh with the scraped photo as fallback — then close it. Do not spend the minute on orbit controls.

**B — New account (only if you must show onboarding)**

1. Sign up → **Set up your tracker**.
2. Step 1 **Your store** — name, niche.
3. Step 2 **Competitors** — paste a real Shopify or Daraz URL (not a made-up shop).
4. Step 3 **Confirm** — wait for discovery.
5. Research should show a non-zero product count if discovery worked. Then capture prices once. Be honest if the site blocked the scrape.

Do not type a product price yourself. The product is that the seller never enters the competitor’s price.

---

### 2:30–3:15 — AI

Still signed in.

1. On Research, scroll to **AI briefing** if you have not already. “Nest builds a fact pack — counts, findings, price band, review themes — then Gemini if `GEMINI_API_KEY` is set, else Claude, else a rule-based rewrite of the same pack.”
2. Click **Ask the analyst** / open **AI Analyst**.
3. Ask something the tools can answer, for example: “Which tracked product changed price?” or “How many competitors am I watching?”
4. If a tool card appears, narrate it: “That is `queryCompetitorData` or `getDashboardSummary` hitting the Nest API with my JWT. It is not browsing the store live.”
5. If chat errors (missing `GOOGLE_GENERATIVE_AI_API_KEY` or quota), show the error card and stop. Do not invent an answer.

---

### 3:15–3:45 — One design decision

“Change detection runs in the API on two snapshots before any model runs. The AI is not allowed to decide that a price dropped unless `detectChanges` already produced `PRICE_DECREASE`. That is why a briefing can be short or fall back to facts, but it should not hallucinate a PKR number we never stored.”

---

### 3:45–4:15 — One real limitation

Pick **one** and stay honest:

- “If Daraz or Shopify change their HTML, discovery or price capture breaks. We log `failed` or `partial` and keep the last snapshot — we do not fake a price.”
- Or: “Gemini’s free tier can run out. You still get a fallback briefing; chat on Vercel needs its own server key and can fail independently.”
- Or: “We match products by our stored product id, not by fuzzy title across two marketplaces. A new URL can look like a brand-new SKU.”

---

### 3:45–4:30 — Close

“What exists today: per-user tracking, scrape and snapshot, deterministic diffs, a research dashboard, a grounded briefing, and a streaming analyst with tools. Next I would add an email digest of the briefing, more marketplaces, and better cross-store product matching — not a bigger chatbot.”

Stop. Do not open slides.

---

## Prep checklist (before you hit record)

- [ ] Live app or local stack is up
- [ ] You can sign in
- [ ] At least one real competitor URL already captured (or a URL you know works)
- [ ] You know whether briefing is Gemini / Claude / fallback today
- [ ] You have a question that matches **your** catalog (do not read a scripted price that is not on screen)
- [x] Demo video is linked from the README: https://www.loom.com/share/2158c3245a4b48298bdb247f02dcfdb3
