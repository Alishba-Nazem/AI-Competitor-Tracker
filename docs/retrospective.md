# Retrospective

This is written to the person I was in Week 1, when the repo was still an empty competitor-monitoring folder and a live Daraz price felt like a detail I could fake later.

## What I set out to build

I wanted a tracker a small seller could use: add rival store URLs, see what they charge, notice catalog changes, and read public complaints. The AI piece was meant to be a weekly briefing, not a chatbot that guessed trends. I picked Shopify and Daraz because those are the pages a Pakistan-market shop already loses time to. The requirement I wrote down — and then tried to dodge — was that a dashboard price had to come from a page, not from me.

## What changed

The first shipped app treated the catalog like one shared notebook. Two signups saw the same competitors. That is fine for a screenshot and fatal for a demo. Wiring `userId` through onboarding, lists, and capture (`23d1eee`) was less visible than the Research layout, but it is the difference between a prototype and a product. Isolate the workspace before you polish the briefing card.

Deploy changed the project more than any UI ticket. The git log is Railway repairs: Node 24, listen on `0.0.0.0`, `prisma db push` on predeploy, CORS locked to `FRONTEND_URL`. I had treated “it runs on localhost:3000” as architecture. Production taught me that a `prisma://` URL, a bad healthcheck path, and a frontend origin mismatch each look like “the scraper is broken” until you read the right log.

AI changed shape twice. I started by wanting Claude to “understand the market.” What survived is smaller: Nest builds a fact pack, `detectChanges` already typed the diffs, and Gemini (or Claude, or a fallback) may only rewrite those facts. Streaming chat came later, with tools that call the same JWT-protected API. Briefing lives on Railway (`GEMINI_API_KEY`); chat lives on Vercel (`GOOGLE_GENERATIVE_AI_API_KEY`). One key dying does not mean the other surface works. Quota used to dump raw API text on Research; hiding that was a product decision, not a prompt tweak.

Verification got stricter because pretty pages lied. WAVE’s online URL report did not see the same homepage a browser paints, so I almost fixed the wrong tree. The extension on the rendered Vercel homepage is the evidence I trust. Lighthouse 85 on Research (23 Aug) and 76 then 87 on a later homepage pass are different days — I will not mash them into a victory graph. Jest stayed at 29 suites / 137 tests when I re-ran it for this packet; Vitest grew from 11 files / 33 tests in the 25 Aug note to 23 / 90 after chat and 3D tests. I only believe numbers I can run again.

## What I would build next

I would not start with a larger model. I would add an email digest of the briefing, widen discovery past Shopify / Daraz / JSON-LD, and attach orphan rows from before `userId`. Cross-store matching is the real gap: today a product is a row id, so a new URL looks like a new SKU. I would also measure scrape outcomes on a named store list.

## Three transferable lessons

**System design: put the deterministic step before the model.** I used to think an AI feature meant the model should look at the database. After watching Gemini invent confidence around missing prices, I flipped the pipeline. Snapshots and `detectChanges` run first. The model receives structured findings or an explicit `stable` / `no_products` status. On the next AI feature I will ask what invariant the code must enforce before a token is generated.

**Debugging: name the boundary that failed.** A blank dashboard is not one bug. It can be CORS, a 401, an empty workspace, a `partial` scrape, or a briefing quota miss. I now write down which hop I am testing — browser → Next, Next → Nest, Nest → Postgres, Nest → store HTML — before I change code. The WAVE homepage miss was the same lesson: verify the rendered document, not the source you hope the crawler sees.

**AI-assisted development and verification.** Claude and ChatGPT were useful for boilerplate, refactors, and architecture talk. They were reckless at inventing env names, test counts, and “the scraper already handles that.” The habit that saved the project was: run `npm test`, read `.env.example`, and refuse to put a number in a README I had not just produced. AI-assisted work made me faster at typing and slower — correctly — at claiming the product was done.

Week-1 me wanted a dashboard that looked finished. The version I trust will show an empty Changes list until the second capture, and a fallback briefing when the key is dead.
