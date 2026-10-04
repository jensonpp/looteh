import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { attachUser, requireAuth } from '../middleware/auth'

const profile = new Hono<{ Bindings: Env; Variables: Variables }>()
profile.use('*', attachUser, requireAuth)

profile.get('/', async (c) => {
  const user = c.var.user!
  const stats = await c.env.DB.prepare(
    'SELECT xp_total, streak_count, last_active_date, email_reminders_enabled FROM user_stats WHERE user_id = ?',
  )
    .bind(user.userId)
    .first<{ xp_total: number; streak_count: number; last_active_date: string | null; email_reminders_enabled: number }>()

  return c.json({
    email: user.email,
    xpTotal: stats?.xp_total ?? 0,
    streakCount: stats?.streak_count ?? 0,
    lastActiveDate: stats?.last_active_date ?? null,
    emailRemindersEnabled: Boolean(stats?.email_reminders_enabled ?? true),
  })
})

profile.patch('/preferences', async (c) => {
  const user = c.var.user!
  const body = await c.req
    .json<{ emailRemindersEnabled?: boolean }>()
    .catch(() => ({}) as { emailRemindersEnabled?: boolean })

  if (typeof body.emailRemindersEnabled !== 'boolean') {
    return c.json({ error: 'invalid_input' }, 400)
  }

  await c.env.DB.prepare('UPDATE user_stats SET email_reminders_enabled = ? WHERE user_id = ?')
    .bind(body.emailRemindersEnabled ? 1 : 0, user.userId)
    .run()

  return c.json({ ok: true })
})

export default profile
