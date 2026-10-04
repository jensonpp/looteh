import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'
import { verifySessionJwt } from '../lib/jwt'

export const SESSION_COOKIE = 'finlit_session'

/** Populates `c.var.user` when a valid, non-revoked session cookie is present. Does not block the request. */
export const attachUser = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  c.set('user', null)
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return next()

  const payload = await verifySessionJwt(token, c.env.JWT_SECRET)
  if (!payload) return next()

  const session = await c.env.DB.prepare(
    'SELECT user_id, email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.revoked_at IS NULL',
  )
    .bind(payload.sid)
    .first<{ user_id: string; email: string }>()

  if (!session) return next()

  c.set('user', { userId: session.user_id, email: session.email })
  return next()
})

/** Blocks the request with 401 unless `attachUser` found a valid session. */
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  if (!c.var.user) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  return next()
})
