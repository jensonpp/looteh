import type { Env } from '../types'
import { newId } from './db'

/** Server-side mirror of key funnel events in D1 — survives ad-blockers that drop client-side PostHog calls. */
export async function logEvent(
  env: Env,
  userId: string,
  eventType: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await env.DB.prepare('INSERT INTO events (id, user_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(newId(), userId, eventType, payload ? JSON.stringify(payload) : null, new Date().toISOString())
    .run()
}
