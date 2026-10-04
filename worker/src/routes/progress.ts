import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { attachUser, requireAuth } from '../middleware/auth'
import { todayUtc } from '../lib/db'
import { nextStreakState, xpForCorrectAnswer, xpForLessonComplete } from '../lib/gamification'
import { logEvent } from '../lib/events'
import { answerSchema, lessonCompleteSchema, parseJsonBody } from '../lib/validation'

const progress = new Hono<{ Bindings: Env; Variables: Variables }>()
progress.use('*', attachUser, requireAuth)

progress.post('/questions/:questionId/answer', async (c) => {
  const user = c.var.user!
  const questionId = c.req.param('questionId')
  const body = await parseJsonBody(c, answerSchema)
  if (!body.success) return body.response
  const { optionId } = body.data

  const question = await c.env.DB.prepare('SELECT id, lesson_id FROM questions WHERE id = ?')
    .bind(questionId)
    .first<{ id: string; lesson_id: string }>()
  if (!question) return c.json({ error: 'not_found' }, 404)

  const option = await c.env.DB.prepare('SELECT id, is_correct FROM answer_options WHERE id = ? AND question_id = ?')
    .bind(optionId, questionId)
    .first<{ id: string; is_correct: number }>()
  if (!option) return c.json({ error: 'invalid_option' }, 400)

  const isCorrect = option.is_correct === 1
  let xpAwarded = 0

  if (isCorrect) {
    xpAwarded = xpForCorrectAnswer()
    await c.env.DB.prepare('UPDATE user_stats SET xp_total = xp_total + ? WHERE user_id = ?')
      .bind(xpAwarded, user.userId)
      .run()
  }

  // Mark lesson in_progress on first interaction (idempotent via upsert).
  await c.env.DB.prepare(
    `INSERT INTO user_lesson_progress (user_id, lesson_id, status, best_score, updated_at)
     VALUES (?, ?, 'in_progress', 0, ?)
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       status = CASE WHEN user_lesson_progress.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
       updated_at = excluded.updated_at`,
  )
    .bind(user.userId, question.lesson_id, new Date().toISOString())
    .run()

  await logEvent(c.env, user.userId, 'question_answered', { questionId, isCorrect })

  return c.json({ correct: isCorrect, xpAwarded })
})

progress.post('/lessons/:lessonId/start', async (c) => {
  const user = c.var.user!
  const lessonId = c.req.param('lessonId')

  await c.env.DB.prepare(
    `INSERT INTO user_lesson_progress (user_id, lesson_id, status, best_score, updated_at)
     VALUES (?, ?, 'in_progress', 0, ?)
     ON CONFLICT (user_id, lesson_id) DO NOTHING`,
  )
    .bind(user.userId, lessonId, new Date().toISOString())
    .run()

  await logEvent(c.env, user.userId, 'lesson_started', { lessonId })
  return c.json({ ok: true })
})

progress.post('/lessons/:lessonId/complete', async (c) => {
  const user = c.var.user!
  const lessonId = c.req.param('lessonId')
  const body = await parseJsonBody(c, lessonCompleteSchema)
  if (!body.success) return body.response
  const { correctCount, totalQuestions } = body.data
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  const stats = await c.env.DB.prepare('SELECT streak_count, last_active_date FROM user_stats WHERE user_id = ?')
    .bind(user.userId)
    .first<{ streak_count: number; last_active_date: string | null }>()

  const today = todayUtc()
  const nextStreak = nextStreakState(
    { streakCount: stats?.streak_count ?? 0, lastActiveDate: stats?.last_active_date ?? null },
    today,
  )
  const bonusXp = xpForLessonComplete()

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO user_lesson_progress (user_id, lesson_id, status, best_score, updated_at)
       VALUES (?, ?, 'completed', ?, ?)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET
         status = 'completed',
         best_score = MAX(user_lesson_progress.best_score, excluded.best_score),
         updated_at = excluded.updated_at`,
    ).bind(user.userId, lessonId, score, new Date().toISOString()),
    c.env.DB.prepare(
      'UPDATE user_stats SET xp_total = xp_total + ?, streak_count = ?, last_active_date = ? WHERE user_id = ?',
    ).bind(bonusXp, nextStreak.streakCount, nextStreak.lastActiveDate, user.userId),
  ])

  await logEvent(c.env, user.userId, 'lesson_completed', { lessonId, score })

  return c.json({ score, bonusXpAwarded: bonusXp, streakCount: nextStreak.streakCount })
})

export default progress
