import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { attachUser, requireAuth } from '../middleware/auth'
import { parseJsonBody, purchaseSchema } from '../lib/validation'
import { awardAchievement } from '../lib/meta'
import { ACHIEVEMENTS, DAILY_QUESTS, GEM_COSTS, MAX_STREAK_FREEZES } from '../lib/quests'

const meta = new Hono<{ Bindings: Env; Variables: Variables }>()
meta.use('*', attachUser, requireAuth)

async function gemsBalance(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT gems FROM user_stats WHERE user_id = ?')
    .bind(userId)
    .first<{ gems: number }>()
  return row?.gems ?? 0
}

/** Today's quests with live progress. Materializes today's rows on first read. */
meta.get('/quests', async (c) => {
  const user = c.var.user!
  const today = new Date().toISOString().slice(0, 10)

  const { results } = await c.env.DB.prepare(
    'SELECT quest_key, progress, gems_claimed FROM user_quests WHERE user_id = ? AND quest_date = ?',
  )
    .bind(user.userId, today)
    .all<{ quest_key: string; progress: number; gems_claimed: number }>()
  const byKey = new Map(results.map((r) => [r.quest_key, r]))

  const quests = DAILY_QUESTS.map((def) => {
    const row = byKey.get(def.key)
    const progress = Math.min(row?.progress ?? 0, def.target)
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      target: def.target,
      progress,
      gemsReward: def.gemsReward,
      completed: progress >= def.target,
      claimable: progress >= def.target && !row?.gems_claimed,
    }
  })

  return c.json({ gems: await gemsBalance(c.env, user.userId), quests })
})

meta.post('/quests/:key/claim', async (c) => {
  const user = c.var.user!
  const key = c.req.param('key')
  const def = DAILY_QUESTS.find((q) => q.key === key)
  if (!def) return c.json({ error: 'not_found' }, 404)

  const today = new Date().toISOString().slice(0, 10)
  const row = await c.env.DB.prepare(
    'SELECT progress, gems_claimed FROM user_quests WHERE user_id = ? AND quest_key = ? AND quest_date = ?',
  )
    .bind(user.userId, key, today)
    .first<{ progress: number; gems_claimed: number }>()

  if (!row || row.progress < def.target) return c.json({ error: 'quest_not_completed' }, 400)
  if (row.gems_claimed) return c.json({ error: 'already_claimed' }, 400)

  await c.env.DB.batch([
    c.env.DB.prepare(
      'UPDATE user_quests SET gems_claimed = 1 WHERE user_id = ? AND quest_key = ? AND quest_date = ?',
    ).bind(user.userId, key, today),
    c.env.DB.prepare('UPDATE user_stats SET gems = gems + ? WHERE user_id = ?').bind(def.gemsReward, user.userId),
  ])

  // quest_master: lifetime claimed quests
  const claimed = await c.env.DB.prepare(
    'SELECT COUNT(*) AS count FROM user_quests WHERE user_id = ? AND gems_claimed = 1',
  )
    .bind(user.userId)
    .first<{ count: number }>()
  if ((claimed?.count ?? 0) >= 10) await awardAchievement(c.env, user.userId, 'quest_master')

  return c.json({ gems: await gemsBalance(c.env, user.userId), gemsAwarded: def.gemsReward })
})

meta.get('/achievements', async (c) => {
  const user = c.var.user!
  const { results } = await c.env.DB.prepare(
    'SELECT achievement_key, earned_at FROM user_achievements WHERE user_id = ?',
  )
    .bind(user.userId)
    .all<{ achievement_key: string; earned_at: string }>()
  const byKey = new Map(results.map((r) => [r.achievement_key, r.earned_at]))

  return c.json({
    achievements: ACHIEVEMENTS.map((def) => ({
      ...def,
      earnedAt: byKey.get(def.key) ?? null,
    })),
  })
})

meta.get('/shop', async (c) => {
  const user = c.var.user!
  const row = await c.env.DB.prepare('SELECT gems, streak_freezes FROM user_stats WHERE user_id = ?')
    .bind(user.userId)
    .first<{ gems: number; streak_freezes: number }>()

  return c.json({
    gems: row?.gems ?? 0,
    streakFreezes: row?.streak_freezes ?? 0,
    maxStreakFreezes: MAX_STREAK_FREEZES,
    items: [
      {
        key: 'streak_freeze',
        title: 'Streak Freeze',
        description: 'Automatically protects your streak for one missed day each',
        cost: GEM_COSTS.streakFreeze,
        owned: row?.streak_freezes ?? 0,
        maxOwned: MAX_STREAK_FREEZES,
      },
      {
        key: 'heart_refill',
        title: 'Heart Refill',
        description: 'Refill your hearts mid-lesson and keep going',
        cost: GEM_COSTS.heartRefill,
        owned: null,
        maxOwned: null,
      },
    ],
  })
})

meta.post('/shop/purchase', async (c) => {
  const user = c.var.user!
  const body = await parseJsonBody(c, purchaseSchema)
  if (!body.success) return body.response
  const { item } = body.data

  const row = await c.env.DB.prepare('SELECT gems, streak_freezes FROM user_stats WHERE user_id = ?')
    .bind(user.userId)
    .first<{ gems: number; streak_freezes: number }>()
  const gems = row?.gems ?? 0
  const freezes = row?.streak_freezes ?? 0

  if (item === 'streak_freeze') {
    if (freezes >= MAX_STREAK_FREEZES) return c.json({ error: 'max_owned' }, 400)
    if (gems < GEM_COSTS.streakFreeze) return c.json({ error: 'insufficient_gems' }, 400)
    await c.env.DB.prepare('UPDATE user_stats SET gems = gems - ?, streak_freezes = streak_freezes + 1 WHERE user_id = ?')
      .bind(GEM_COSTS.streakFreeze, user.userId)
      .run()
    return c.json({ gems: gems - GEM_COSTS.streakFreeze, streakFreezes: freezes + 1 })
  }

  // heart_refill: hearts are per-lesson client state; the server just takes the gems.
  if (gems < GEM_COSTS.heartRefill) return c.json({ error: 'insufficient_gems' }, 400)
  await c.env.DB.prepare('UPDATE user_stats SET gems = gems - ? WHERE user_id = ?')
    .bind(GEM_COSTS.heartRefill, user.userId)
    .run()
  return c.json({ gems: gems - GEM_COSTS.heartRefill, streakFreezes: freezes })
})

export default meta