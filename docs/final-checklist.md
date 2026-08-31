# Final checklist — Assignment 8.1 and 8.2

Status key:

- **Completed** — exists in the repo and was checked against the codebase while writing this packet
- **Incomplete** — required by the assignment, not done yet
- **TODO** — you still need to add a URL, file, or recording

---

## Assignment 8.1 — Documentation and Demo

### Completed

- [x] **README** — root [README.md](../README.md) titled *AI Competitor Price & Product Change Tracker*, with overview, verified features, stack, Mermaid architecture, setup, env vars, usage, V2 evaluation, limitations, future work, AI transparency, live app and demo video links
- [x] **Reproducible setup** — clone, `backend` / `frontend` install, Prisma `generate` + `db push`, `start:dev` / `dev`, build scripts from each `package.json`
- [x] **Usage examples** — README usage section + this checklist’s verify commands
- [x] **Architecture** — [architecture.md](./architecture.md)
- [x] **V2 evaluation** — [v2-evaluation.md](./v2-evaluation.md) (dated evidence only; Playwright/backend e2e local logs still TODO)
- [x] **Limitations** — README Limitations (scraping, APIs, AI verification, matching, hosting)
- [x] **AI transparency** — README *AI Transparency* (Claude and ChatGPT; human review and decisions)
- [x] **Design decision documented** — change detection before AI ([architecture.md](./architecture.md), demo script)
- [x] **Central repository** — https://github.com/Alishba-Nazem/AI-Competitor-Tracker
- [x] **Submission index** — [submission-index.md](./submission-index.md)
- [x] **Demo script** — [demo-script.md](./demo-script.md) (3–5 min, no slides)
- [x] **Live application** — https://ai-competitor-tracker.vercel.app/
- [x] **3–5 minute demo video** — https://www.loom.com/share/2158c3245a4b48298bdb247f02dcfdb3
- [x] **Live run on camera** — recorded walkthrough of the live app (Loom)
- [x] **Showcase / build-in-public thread** — https://lnkd.in/p/dbk5mvBB

### Incomplete / TODO

- [ ] **Design decision explained on camera** — snapshot diffs before the model (script 3:15–3:45)
- [ ] **Limitation explained on camera** — HTML scrape fragility, Gemini quota, or product-id matching (script 3:45–4:15)
- [ ] **Playwright + backend e2e logs attached** — specs and CI exist; latest local pass counts not recorded in this session

---

## Assignment 8.2 — Final Package, Retrospective, and Capstone

### Completed

- [x] **Submission index** — [submission-index.md](./submission-index.md)
- [x] **500–800 word retrospective** — [retrospective.md](./retrospective.md)
- [x] **Demo video linked from README and this index** — https://www.loom.com/share/2158c3245a4b48298bdb247f02dcfdb3
- [x] **Build-in-public post** — https://lnkd.in/p/dbk5mvBB

### Incomplete / TODO

- [ ] **Hours log** — `TODO — add hours log URL or file`
- [ ] **FlyRank domain / personal site** — `TODO — add personal site URL`
- [ ] **Final review** — `TODO — add final review URL or notes`

---

## Quality gate (docs pass)

Checked while writing the packet:

- [x] Features listed in the README exist in the repo
- [x] Setup commands match `frontend/package.json` and `backend/package.json`
- [x] Environment variable names match `frontend/.env.example` and `backend/.env.example`
- [x] No secret values copied into docs
- [x] Evaluation numbers are dated and sourced (or marked TODO)
- [x] README links to files that exist (`docs/*`, `DEPLOYMENT.md`, `AUDIT.md`)
- [x] Application code was not changed for this documentation pass
