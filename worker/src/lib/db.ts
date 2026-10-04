import type { Env } from '../types'

export function db(env: Env): D1Database {
  return env.DB
}

export function newId(): string {
  return crypto.randomUUID()
}

/** Server's own UTC date as YYYY-MM-DD — never trust client-supplied dates for streak logic. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}
