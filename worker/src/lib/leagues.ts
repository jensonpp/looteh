import type { Env } from '../types'

export const LEAGUE_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const
export type LeagueTier = (typeof LEAGUE_TIERS)[number]

export const PROMOTE_COUNT = 7
export const DEMOTE_COUNT = 5
export const LEAGUE_SIZE = 30

/** Monday UTC of the week containing `dateStr`, as YYYY-MM-DD. */
export function weekStartUtc(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  const dow = date.getUTCDay() // 0=Sun .. 6=Sat
  date.setUTCDate(date.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return date.toISOString().slice(0, 10)
}

export function currentWeekStart(): string {
  return weekStartUtc(new Date().toISOString().slice(0, 10))
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Total XP earned by `userId` in [from, toExcl). */
export async function weeklyXp(env: Env, userId: string, from: string, toExcl: string): Promise<number> {
  const row = await env.DB.prepare(
    'SELECT COALESCE(SUM(xp), 0) AS xp FROM user_daily_xp WHERE user_id = ? AND xp_date >= ? AND xp_date < ?',
  )
    .bind(userId, from, toExcl)
    .first<{ xp: number }>()
  return row?.xp ?? 0
}

/**
 * Ensures the user has a league membership for the current week. On the first
 * activity of a new week, promotes/demotes based on last week's cohort rank
 * (lazy rollover — no cron needed). Returns the user's current tier.
 */
export async function ensureLeagueMembership(env: Env, userId: string): Promise<LeagueTier> {
  const thisWeek = currentWeekStart()
  const existing = await env.DB.prepare(
    'SELECT tier FROM league_memberships WHERE user_id = ? AND week_start = ?',
  )
    .bind(userId, thisWeek)
    .first<{ tier: LeagueTier }>()
  if (existing) return existing.tier

  const lastWeek = addDays(thisWeek, -7)
  const prev = await env.DB.prepare(
    'SELECT tier FROM league_memberships WHERE user_id = ? AND week_start = ?',
  )
    .bind(userId, lastWeek)
    .first<{ tier: LeagueTier }>()

  let tier: LeagueTier = 'bronze'
  if (prev) {
    const myXp = await weeklyXp(env, userId, lastWeek, thisWeek)
    const ahead = await env.DB.prepare(
      `SELECT COUNT(*) AS ahead FROM (
         SELECT lm.user_id,
                COALESCE((SELECT SUM(xp) FROM user_daily_xp dx
                          WHERE dx.user_id = lm.user_id AND dx.xp_date >= ? AND dx.xp_date < ?), 0) AS xp
         FROM league_memberships lm
         WHERE lm.week_start = ? AND lm.tier = ?
       ) WHERE xp > ?`,
    )
      .bind(lastWeek, thisWeek, lastWeek, prev.tier, myXp)
      .first<{ ahead: number }>()
    const myRank = (ahead?.ahead ?? 0) + 1

    const idx = LEAGUE_TIERS.indexOf(prev.tier)
    if (myRank <= PROMOTE_COUNT && idx < LEAGUE_TIERS.length - 1) tier = LEAGUE_TIERS[idx + 1]
    else if (myRank > LEAGUE_SIZE - DEMOTE_COUNT && idx > 0) tier = LEAGUE_TIERS[idx - 1]
    else tier = prev.tier
  }

  await env.DB.prepare(
    `INSERT INTO league_memberships (user_id, tier, week_start) VALUES (?, ?, ?)
     ON CONFLICT (user_id, week_start) DO NOTHING`,
  )
    .bind(userId, tier, thisWeek)
    .run()
  return tier
}

export interface LeagueRow {
  userId: string
  name: string
  xp: number
  isMe: boolean
}

export interface LeagueBoard {
  tier: LeagueTier
  weekStart: string
  myRank: number | null
  rows: LeagueRow[]
}

/** Current-week leaderboard for the user's tier cohort. */
export async function getLeagueBoard(env: Env, userId: string): Promise<LeagueBoard> {
  const tier = await ensureLeagueMembership(env, userId)
  const thisWeek = currentWeekStart()
  const nextWeek = addDays(thisWeek, 7)

  const results = await env.DB.prepare(
    `SELECT lm.user_id, u.email,
            COALESCE((SELECT SUM(xp) FROM user_daily_xp dx
                      WHERE dx.user_id = lm.user_id AND dx.xp_date >= ? AND dx.xp_date < ?), 0) AS xp
     FROM league_memberships lm
     JOIN users u ON u.id = lm.user_id
     WHERE lm.week_start = ? AND lm.tier = ?
     ORDER BY xp DESC, u.email ASC
     LIMIT ?`,
  )
    .bind(thisWeek, nextWeek, thisWeek, tier, LEAGUE_SIZE)
    .all<{ user_id: string; email: string; xp: number }>()

  const rows: LeagueRow[] = (results.results ?? []).map((r) => ({
    userId: r.user_id,
    name: r.email.split('@')[0],
    xp: r.xp,
    isMe: r.user_id === userId,
  }))
  const myRank = rows.findIndex((r) => r.isMe)
  return { tier, weekStart: thisWeek, myRank: myRank === -1 ? null : myRank + 1, rows }
}