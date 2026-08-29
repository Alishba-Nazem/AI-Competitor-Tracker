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

Motion assignment demo (no sign-in): **http://localhost:3001/motion-demo**

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

## 3D Product Experience

On the **Products** table (`/products`), each row has a **View in 3D** action that opens a modal with an interactive 3D preview of that tracked product, alongside a live customization panel (color, material, roughness, auto-rotate, manual rotate/zoom, reset). It sits next to **Capture Now** rather than replacing anything — the table, filters, capture flow, and API calls are unchanged.

### Why here

`/products` was the only existing screen with a per-item "product" concept a 3D view could attach to (the app tracks competitor listings, it doesn't sell physical products itself). Products already carry a real `imageUrl` scraped from the competitor's store, so that photo is the natural fallback/evidence image — no new content had to be invented.

### Technologies

`three`, `@react-three/fiber`, `@react-three/drei` (added; nothing else new). Everything else — the modal, buttons, panel, layout — reuses the existing `Modal`/`Field`/button classes from `components/ui.tsx` and the existing Tailwind v4 setup. `Modal` gained one optional `widthClassName` prop (default unchanged) so this feature could ask for a wider dialog without touching any other caller.

### Main interactions

- **Orbit/zoom** — `@react-three/drei` `OrbitControls`, mouse drag or touch drag to rotate, wheel or pinch to zoom (`enablePan` off so it can't be confused with page panning on mobile).
- **Color** — White / Black / Blue / Red swatches update the model's material color immediately.
- **Material** — Matte / Metallic segmented control changes `metalness`; a separate **Roughness** slider gives finer control on top of that.
- **Auto rotate** — toggle; spins the model at a fixed, slow rate via `useFrame` when on.
- **Reset view** — returns the camera to its initial position/target.
- **Manual rotate/zoom buttons** — keyboard- and screen-reader-reachable equivalents of drag-to-orbit and pinch-to-zoom, so the feature isn't mouse/touch-only.

### 3D model

There is no product-specific 3D asset in this project (products are scraped listings with photos, not models I have the rights to reproduce as GLB). Rather than block the feature on sourcing and licensing an unrelated stock model, `ProductModel` (`components/product-3d/product-model.tsx`) builds a small bottle-shaped mesh from primitive geometries (a handful of `cylinderGeometry` calls: body, shoulder, neck, cap, label band) — a few thousand triangles, one shared `meshStandardMaterial`, zero textures, zero network requests for geometry. The component is structured so a real GLB could be dropped in later via `@react-three/drei`'s `useGLTF` without touching the scene, controls, or configurator.

### How the scene loads (lazy loading)

Only `product-3d-scene.tsx` imports `three` / `@react-three/fiber` / `@react-three/drei`. It's loaded with:

```ts
const Product3DScene = dynamic(() => import("./product-3d-scene"), {
  ssr: false,
  loading: () => <SceneLoadingSkeleton />,
});
```

inside `product-3d-viewer.tsx`, which itself is only mounted when a row's **View in 3D** button is clicked (`Product3DModal` renders `null` until a product is selected — same pattern as the existing `AddProductModal`). So the 3D runtime never loads on initial page load, and doesn't even load when a signed-in user just browses the products table — only on demand.

**Measured chunk size** (production build, `npm run build`): the lazy chunk group registered for `/products` in `.next/server/app/.../react-loadable-manifest.json` is **906,174 bytes raw / 238,795 bytes gzip** (three.js + R3F + drei runtime; verified with `zlib.gzipSync`). That chunk does **not** appear in the products page's eagerly-loaded script list — confirmed by inspecting the manifest — so a visit to `/products` that never opens the modal does not pay this cost.

### Fallback strategy

Three independent layers keep the page from ever going blank:

1. **WebGL probe** (`webgl-support.ts`) — checked once before the canvas is even attempted. No WebGL → straight to the fallback, no wasted work.
2. **Error boundary** (`Product3DErrorBoundary`) around the `Suspense` boundary — if the scene throws at runtime (context creation failure, driver issue, etc.), it's caught and swapped for the fallback instead of crashing the products page.
3. **Fallback UI** (`Product3DFallback`) — shows the product's real `imageUrl` (or a generic icon if none was ever captured) plus "3D preview unavailable on this device." / "3D preview could not be loaded. Showing product photo instead." The product name/price header and the rest of the table are unaffected either way.

### Reduced motion

Auto-rotate reads `useReducedMotion()` from `framer-motion` — the same hook `MotionLifecycleButton` already uses elsewhere in this codebase, so this feature follows an existing convention rather than inventing a new one. When the OS preference is set: auto-rotate is forced off, the toggle is disabled with an inline "(off · reduced motion)" note, and the model stays static until the user manually drags/uses the rotate buttons. Manual orbit, zoom, and the configurator are never disabled by this preference — only the continuous animation is.

### Performance and mobile

- `dpr={[1, 1.5]}` caps device pixel ratio so high-DPI phones don't render at full native resolution.
- `gl={{ powerPreference: "low-power" }}`, no post-processing, no HDRI/environment map (would mean an extra network fetch every open), procedural `ContactShadows` instead of a baked shadow texture.
- Auto-rotate is the only continuous per-frame work, and it's skipped entirely (`spin=false` short-circuits before touching the ref) whenever it's off or reduced motion is on.
- `OrbitControls` handles touch natively (one-finger drag to orbit, two-finger pinch to zoom); `enablePan` is off so a stray touch can't drag the product off-screen.
- The scene component unmounts along with the modal (React Three Fiber tears down the `WebGLRenderer`/GL context on unmount), so closing the modal releases the GPU resources.

### What was actually verified this session

- `npm run typecheck` — passes.
- `npm run build` (Turbopack production build) — passes; used to measure the chunk size above via the real manifest and `zlib.gzipSync`, not an estimate.
- `npm test` (Vitest) — 23 files / 90 tests pass, including two new files for this feature (`product-3d-viewer.test.tsx`, `product-3d-viewer.reduced-motion.test.tsx`) covering: WebGL-unavailable fallback (jsdom has no WebGL, so this exercises the real no-WebGL code path), configurator controls rendering and being reachable without a working canvas, default auto-rotate state, and the reduced-motion branch (mocking `window.matchMedia` in an isolated test file, since `useReducedMotion()` caches the OS query on first read).
- `npm run lint` — pre-existing failures in this repo (unrelated files: `workspace.tsx`, `settings/page.tsx`, `ai-chat.tsx`, and a stray `frontend/frontend/.next` build folder from an earlier run) are unchanged by this feature; none of the new/edited files (`components/product-3d/*`, `products-content.tsx`, `components/ui.tsx`) produced any lint errors.

**Not verified this session** (would need a running Postgres + backend + signed-in browser session, which wasn't set up here): Lighthouse score on a live `/products` page with the 3D modal open, and real-device frame-rate/thermal behavior. The existing production Lighthouse baseline for this app is documented in [docs/CAPSTONE.md](./docs/CAPSTONE.md) (Performance 85 on mobile); this feature was deliberately code-split so that baseline shouldn't move for users who never open the 3D modal, but that has not been re-measured live. Anyone continuing this: run Lighthouse on `/products` before/after opening the modal, and test on a real mid-range Android device for frame pacing.

### What could be improved with more time

- Swap the procedural placeholder for a real, license-cleared GLB per product category, using the `useGLTF` hook the architecture already supports.
- Persist the chosen color/material per product (currently resets when the modal closes).
- Add a Draco/Meshopt-compressed GLTF pipeline if/when a real model is introduced, plus a `<meshopt>`/`<KTX2>` texture path.
- Re-run Lighthouse/WebPageTest on `/products` before and after opening the viewer, on real mid-range Android hardware, and record the numbers here.

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
