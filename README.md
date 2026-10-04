# FinLit

Duolingo-style financial literacy web app. See the project plan at
`../create-a-technical-solution-inherited-dream.md` for full architecture decisions, milestones, and the
v1/v2 scope split (hearts & badges are v2 — deliberately not built yet).

## Stack
- **Frontend:** React + Vite + Tailwind CSS, Zustand, React Router, PostHog.
- **Backend:** Cloudflare Worker (Hono) + D1, single origin serving both API and built SPA.
- **Auth:** email/password (PBKDF2 + HS256 JWT via Web Crypto), `httpOnly` session cookie, revocable sessions.

## Local development

```bash
npm install                      # from repo root (npm workspaces)

# one-time: local D1 schema
cd worker && npx wrangler d1 migrations apply finlit-db --local && cd ..

# terminal 1: Worker API (Hono) on :8787
npm run dev:worker

# terminal 2: Vite dev server on :5173 (proxies /api -> :8787)
npm run dev:frontend
```

Copy `worker/.dev.vars.example` to `worker/.dev.vars` before first run (already done in this checkout).

### Production-topology smoke test (single Worker serving built SPA + API)
```bash
npm run build:frontend
cd worker && npx wrangler dev --port 8787
# then curl http://localhost:8787/ and http://localhost:8787/api/health
```

## Testing
```bash
npm run test:worker
```
Runs plain Node Vitest (not `@cloudflare/vitest-pool-workers`) against `gamification.ts`, `password.ts`, and
`jwt.ts` — all pure Web Crypto/JS with no D1/KV bindings, so Node's native Web Crypto is sufficient and this
sidesteps a known `vitest-pool-workers` module-resolution bug with spaces in the absolute project path.

## Deploy
```bash
npx wrangler d1 create finlit-db          # then paste the returned ID into worker/wrangler.toml
npx wrangler d1 migrations apply finlit-db --remote
cd worker
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
cd ..
npm run deploy
```

## Required third-party accounts (set up before Milestone 6)
- **PostHog** — free tier, set `VITE_POSTHOG_KEY` (and optionally `VITE_POSTHOG_HOST`) in `frontend/.env.local`.
- **Resend** — free tier, set via `wrangler secret put RESEND_API_KEY` (used by the daily streak-reminder Cron Trigger).

## Status
- [x] Milestone 1 — Scaffolding
- [x] Milestone 2 — DB schema (v1 only; hearts/badges deferred to v2)
- [x] Milestone 3 — Auth backend (verified via curl: signup/login/session/logout, cookie flags, revocation)
- [ ] Milestone 0 — Content validation (do this next, in parallel with content authoring)
- [ ] Milestone 4 — Seed content
- [ ] Milestone 5 — Content & progress backend
- [ ] Milestone 6 — Analytics & retention plumbing (PostHog events wired on frontend; Cron handler stubbed, needs Resend key + live testing)
- [x] Milestone 7 (partial) — Frontend auth & shell (Login/Signup/RequireAuth/router/Legal+disclaimer footer all working end-to-end)
- [ ] Milestone 8 — Skill tree & lesson player
- [ ] Milestone 9 — Profile & preferences
- [ ] Milestone 10 — Build & deploy (remote)
- [ ] Milestone 11 — Hardening (zod validation, consistent error handling)
