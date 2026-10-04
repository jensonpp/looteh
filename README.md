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
**Last verified: working end-to-end in a real browser** (signup → skill tree → lesson → quiz → XP/streak → result), not just via curl.

- [x] Milestone 1 — Scaffolding
- [x] Milestone 2 — DB schema (v1 only; hearts/badges deferred to v2)
- [x] Milestone 3 — Auth backend (verified via curl: signup/login/session/logout, cookie flags, revocation)
- [x] Milestone 0/4 — Content pipeline + vertical slice: `units.json` schema, `generate-seed-sql.ts` compiler,
      1 real unit (Money Mindset & Goals, 2 lessons, 4 questions) seeded locally
- [x] Milestone 5 — Content & progress backend (`/units`, `/units/:id/lessons`, `/lessons/:id`,
      `/questions/:id/answer`, `/lessons/:id/complete`, `/profile`) — verified via curl: correctness never
      leaks to client, XP/streak/best-score all update correctly, events logged to D1
- [x] Milestone 6 (partial) — `events` table + server-side logging wired; PostHog frontend hook present but
      needs a real `VITE_POSTHOG_KEY`; Resend Cron handler stubbed but needs a real `RESEND_API_KEY` + live test
- [x] Milestone 7 — Frontend auth & shell (Login/Signup cross-links, RequireAuth, router, Legal+disclaimer footer)
- [x] Milestone 8 — Skill tree & lesson player: real unit list (lock/complete state), lesson list, full
      concept→quiz→result flow confirmed working live in-browser
- [ ] Milestone 9 — Profile page UI (backend route exists; no page yet) + reminder-email toggle UI
- [ ] Milestone 10 — Build & deploy (remote D1, real PostHog/Resend keys, `wrangler deploy`)
- [ ] Milestone 11 — Hardening (zod validation, consistent error handling)

## Bugs found & fixed during manual testing
- **Session cookie `Secure` flag in local dev**: was hardcoded `true`, which some browsers (Safari) silently
  refuse to store over plain `http://localhost` — login appeared to succeed but every following authenticated
  request 401'd. Now conditional on `APP_ENV !== 'development'`; still enforced outside local dev.
- **SPA fallback not reached for client-router paths** (e.g. `/login` 404'd when hit directly): the Worker's
  Hono app needed an explicit catch-all (`app.get('*', c => c.env.ASSETS.fetch(c.req.raw))`) — Workers don't
  auto-fall-back to `[assets]` SPA mode once a `main` script is handling the request.


## Remaining before this is more than a 1-unit proof of concept
- Author the rest of the curriculum (`worker/seed/units.json`) past unit 1 — see candidate outline in the plan doc.
- Build the Profile page UI.
- Set up real PostHog + Resend accounts and verify the live retention loop (see README "Required third-party accounts").
