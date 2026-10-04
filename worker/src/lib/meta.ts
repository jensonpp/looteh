import type { Env } from '../types'
import { ACHIEVEMENTS, DAILY_QUESTS } from './quests'

/**
 * Bumps a daily quest's progress (upserting the row for today) and returns
 * whether the quest just crossed its target.
 */
export async function bumpQuest(env: Env, userId: string, questKey: string, delta: number): Promise<void> {
  const def = DAILY_QUESTS.find((q) => q.key === questKey)
  if (!def) return
  const today = new Date().toISOString().slice(0, 10)

  await env.DB.prepare(
    `INSERT INTO user_quests (user_id, quest_key, quest_date, progress, gems_claimed)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT (user_id, quest_key, quest_date) DO UPDATE SET
       progress = MIN(user_quests.progress + excluded.progress, ?)`,
  )
    .bind(userId, questKey, today, Math.min(delta, def.target), def.target)
    .run()
}

/** Adds to the daily XP ledger (used by weekly leagues). */
export async function bumpDailyXp(env: Env, userId: string, xp: number): Promise<void> {
  if (xp <= 0) return
  const today = new Date().toISOString().slice(0, 10)
  await env.DB.prepare(
    `INSERT INTO user_daily_xp (user_id, xp_date, xp) VALUES (?, ?, ?)
     ON CONFLICT (user_id, xp_date) DO UPDATE SET xp = user_daily_xp.xp + excluded.xp`,
  )
    .bind(userId, today, xp)
    .run()
}

/**
 * Awards an achievement if not already earned. Returns the gems awarded (0 if
 * already earned or unknown key).
 */
export async function awardAchievement(env: Env, userId: string, key: string): Promise<number> {
  const def = ACHIEVEMENTS.find((a) => a.key === key)
  if (!def) return 0

  const res = await env.DB.prepare(
    'INSERT OR IGNORE INTO user_achievements (user_id, achievement_key, earned_at) VALUES (?, ?, ?)',
  )
    .bind(userId, key, new Date().toISOString())
    .run()
  if (!res.meta.changes) return 0

  await env.DB.prepare('UPDATE user_stats SET gems = gems + ? WHERE user_id = ?').bind(def.gemsReward, userId).run()
  return def.gemsReward
}

/**
 * Evaluates lesson-driven achievements after a lesson completion.
 * `score` is the just-completed lesson's score; `streakCount` the post-update streak.
 */
export async function evaluateLessonAchievements(
  env: Env,
  userId: string,
  lessonId: string,
  score: number,
  streakCount: number,
): Promise<string[]> {
  const earned: string[] = []

  const push = async (key: string) => {
    if (await awardAchievement(env, userId, key)) earned.push(key)
  }

  const completed = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM user_lesson_progress WHERE user_id = ? AND status = 'completed'`,
  )
    .bind(userId)
    .first<{ count: number }>()
  const completedCount = completed?.count ?? 0

  if (completedCount >= 1) await push('first_lesson')
  if (completedCount >= 5) await push('five_lessons')
  if (score === 100) await push('perfect_lesson')
  if (streakCount >= 7) await push('streak_7')

  const stats = await env.DB.prepare('SELECT xp_total FROM user_stats WHERE user_id = ?')
    .bind(userId)
    .first<{ xp_total: number }>()
  if ((stats?.xp_total ?? 0) >= 500) await push('xp_500')

  // Unit champion: every lesson in this lesson's unit is completed by this user.
  const unit = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM lessons WHERE unit_id = (SELECT unit_id FROM lessons WHERE id = ?)) AS total,
       (SELECT COUNT(*) FROM user_lesson_progress ulp
        JOIN lessons l ON l.id = ulp.lesson_id
        WHERE l.unit_id = (SELECT unit_id FROM lessons WHERE id = ?)
          AND ulp.user_id = ? AND ulp.status = 'completed') AS done`,
  )
    .bind(lessonId, lessonId, userId)
    .first<{ total: number; done: number }>()
  if (unit && unit.total > 0 && unit.done >= unit.total) await push('unit_champion')

  return earned
}