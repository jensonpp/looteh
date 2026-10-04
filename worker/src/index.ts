import { Hono } from 'hono'
import type { Env, Variables } from './types'
import auth from './routes/auth'
import content from './routes/content'
import progress from './routes/progress'
import profile from './routes/profile'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/api/health', (c) => c.json({ ok: true, env: c.env.APP_ENV }))

app.route('/api/auth', auth)
app.route('/api', content)
app.route('/api', progress)
app.route('/api/profile', profile)

// Any non-API route that didn't match a static asset falls back to the SPA shell
// (client-side router in frontend/src/App.tsx handles the actual path).
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

// Cloudflare Workers Cron Trigger entry point (streak-reminder email job).
export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const { runStreakReminderJob } = await import('./cron/streak-reminder')
    ctx.waitUntil(runStreakReminderJob(env))
  },
}
