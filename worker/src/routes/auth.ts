import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'
import { hashPassword, verifyPassword } from '../lib/password'
import { signSessionJwt, verifySessionJwt } from '../lib/jwt'
import { newId } from '../lib/db'
import { attachUser, requireAuth, SESSION_COOKIE } from '../middleware/auth'

const auth = new Hono<{ Bindings: Env; Variables: Variables }>()
auth.use('*', attachUser)

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

auth.post('/signup', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}) as { email?: string; password?: string })
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !isValidEmail(email) || !password || password.length < 8) {
    return c.json({ error: 'invalid_input', message: 'Valid email and password (min 8 chars) required.' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) {
    return c.json({ error: 'email_taken' }, 409)
  }

  const userId = newId()
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').bind(
      userId,
      email,
      passwordHash,
      now,
    ),
    c.env.DB.prepare(
      'INSERT INTO user_stats (user_id, xp_total, streak_count, last_active_date, email_reminders_enabled) VALUES (?, 0, 0, NULL, 1)',
    ).bind(userId),
  ])

  const sessionId = newId()
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)')
    .bind(sessionId, userId, now)
    .run()

  const token = await signSessionJwt({ sub: userId, sid: sessionId }, c.env.JWT_SECRET)
  setCookie(c, SESSION_COOKIE, token, COOKIE_OPTS)

  return c.json({ user: { id: userId, email } }, 201)
})

auth.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}) as { email?: string; password?: string })
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !password) {
    return c.json({ error: 'invalid_input' }, 400)
  }

  const user = await c.env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string }>()

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'invalid_credentials' }, 401)
  }

  const sessionId = newId()
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)')
    .bind(sessionId, user.id, new Date().toISOString())
    .run()

  const token = await signSessionJwt({ sub: user.id, sid: sessionId }, c.env.JWT_SECRET)
  setCookie(c, SESSION_COOKIE, token, COOKIE_OPTS)

  return c.json({ user: { id: user.id, email: user.email } })
})

auth.post('/logout', requireAuth, async (c) => {
  const user = c.var.user!
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    const payload = await verifySessionJwt(token, c.env.JWT_SECRET)
    if (payload) {
      await c.env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), payload.sid)
        .run()
    }
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  return c.json({ ok: true, userId: user.userId })
})

auth.get('/session', (c) => {
  const user = c.var.user
  if (!user) return c.json({ user: null }, 200)
  return c.json({ user: { id: user.userId, email: user.email } })
})

export default auth
