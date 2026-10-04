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
**Live:** https://finlit.jensonsworld.workers.dev (Cloudflare Worker, remote D1, deployed manually — not yet
wired to CI/auto-deploy-on-push; see Status below).

```bash
npx wrangler d1 create finlit-db          # then paste the returned ID into worker/wrangler.toml under [env.production.d1_databases]
npx wrangler d1 migrations apply finlit-db --remote
cd worker
npx wrangler secret put JWT_SECRET --env production      # pipe directly, NOT through a filtering wrapper — see Bugs below
npx wrangler secret put RESEND_API_KEY --env production
cd ..
npm run build:frontend
cd worker && npx wrangler deploy --env production
```

Note: `wrangler.toml` has a top-level `[vars] APP_ENV = "development"` (used by local `wrangler dev`, keeps
the session cookie's `Secure` flag off for plain `http://localhost`) and a separate `[env.production]` block
with `APP_ENV = "production"` (enforces `Secure` cookies, same Worker name `finlit` so it's a single script).

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
- [x] Milestone 9 — Profile page UI (XP/streak display, email-reminder toggle) — verified via curl end-to-end
- [x] Milestone 10 — Remote deploy: live at https://finlit.jensonsworld.workers.dev (remote D1 created +
      migrated, JWT_SECRET set as a Worker secret, deployed via `wrangler deploy --env production`) —
      verified via curl: signup/login/logout/units/profile all work against the live URL
- [x] Milestone 11 — Hardening: zod validation on all route bodies (`worker/src/lib/validation.ts` +
      `parseJsonBody` helper; 400 with field-level messages on bad input), verified live via curl;
      30/30 tests pass, `tsc --noEmit` clean. Consistent error envelope via `app.onError` (see below).
- [x] Curriculum units 1–6 authored & seeded (Money Mindset & Goals, Budgeting Basics, Tracking Spending,
      Emergency Funds, Understanding Debt, Credit Scores — 12 lessons, 24 questions). Seed generator is
      now incremental: new units compile into the next numbered migration, so content can ship to
      already-migrated databases (see `docs/CONTENT_AUTHORING.md`). Units 7–20 from the plan outline remain.
- [x] Production content deploy: 0003 migration applied to remote D1, worker redeployed with
      `--env production` (deploy script fixed to include it) — verified live at
      https://finlit.jensonsworld.workers.dev: 6 units, correct lock chain, zod validation returning 400s.
- [x] Full curriculum authored & seeded: units 1–20 (40 lessons, 80 questions) — Money Mindset through
      Putting It Together, matching the plan doc's 20-unit outline. Incremental generator emitted
      `0004_seed_content.sql` (14 new units; 1–6 skipped), applied locally and verified: 20 units,
      unlock chain intact (completing unit 1 unlocks unit 2), 30/30 tests, `tsc --noEmit` clean.

## Bugs found & fixed during manual testing
- **Session cookie `Secure` flag in local dev**: was hardcoded `true`, which some browsers (Safari) silently
  refuse to store over plain `http://localhost` — login appeared to succeed but every following authenticated
  request 401'd. Now conditional on `APP_ENV !== 'development'`; still enforced outside local dev.
- **SPA fallback not reached for client-router paths** (e.g. `/login` 404'd when hit directly): the Worker's
  Hono app needed an explicit catch-all (`app.get('*', c => c.env.ASSETS.fetch(c.req.raw))`) — Workers don't
  auto-fall-back to `[assets]` SPA mode once a `main` script is handling the request.
- **Deployed as Cloudflare Pages instead of Workers**: the dashboard "Connect to Git" flow defaulted to a
  Pages project, which doesn't support this app's D1 bindings/Cron Trigger/Workers static-assets config the
  same way. Fixed by deploying directly as a Worker via `wrangler deploy --env production` instead (CI
  auto-deploy on push can still be wired up later via Workers Builds, not Pages).
- **Frontend never built on CI**: initial dashboard build command only ran `npm install` in `worker/`, so
  `frontend/dist` (gitignored) never existed remotely → 404 on every route. Added a `ci:build` npm script
  (`worker/package.json`) that builds the frontend first.
- **`JWT_SECRET` ended up empty in production**: piping the generated secret through our shell wrapper for
  `wrangler secret put` silently dropped stdin, so the stored secret was an empty string — `crypto.subtle
  .importKey` then threw `Imported HMAC key length (0)...` on every signup/login, visible only via
  `wrangler tail` (confirmed via a temporary verbose `app.onError`, since removed/gated to non-production).
  Fixed by piping directly (bypassing the wrapper) and re-setting the secret.
- **`verifyPassword` ignored the iteration count embedded in stored hashes**: always used the current
  `PBKDF2_ITERATIONS` constant instead of the value in `pbkdf2$<iterations>$...`, so lowering the constant
  (done alongside this round of fixes) would have broken login for any existing users. Fixed to parse and use
  the stored iteration count.
- Added a global `app.onError` handler for a consistent JSON error envelope (`{error, message?}`), with the
  `message` field suppressed when `APP_ENV === 'production'` to avoid leaking internals to real users.


## Remaining before this is a finished product
- Set up real PostHog + Resend accounts and verify the live retention loop (see README "Required third-party accounts") — deferred for now.
- Wire up CI auto-deploy on push (Cloudflare Workers Builds, Git-connected) — currently deploys are manual via
  `npm run deploy` (which builds the frontend, then runs `wrangler deploy --env production`). Dashboard steps:
  1. Cloudflare dashboard → Workers & Pages → **finlit** → Settings → **Build** → "Connect" next to "Source code".
  2. Authorize GitHub, select the `jensonpp/looteh` repo, production branch `main`.
  3. Build settings: root directory `worker`, build command `npm ci && cd ../frontend && npm ci && npm run build`,
     deploy command `npx wrangler deploy --env production` (Workers Builds injects its own `CLOUDFLARE_API_TOKEN`).
  4. Note: D1 migrations are NOT auto-applied by Workers Builds — after pushing new content, run
     `npm run db:migrate:remote` in `worker/` once (append-only, so this is safe to repeat).
