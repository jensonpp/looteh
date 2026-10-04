import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { attachUser, requireAuth } from '../middleware/auth'
import { todayUtc } from '../lib/db'
import { nextStreakState, xpForCorrectAnswer, xpForLessonComplete } from '../lib/gamification'
import { logEvent } from '../lib/events'
import { normalizeAnswer } from '../lib/text'
import { bumpDailyXp, bumpQuest, evaluateLessonAchievements } from '../lib/meta'
import { ACHIEVEMENTS } from '../lib/quests'
import { answerSchema, checkSchema, lessonCompleteSchema, parseJsonBody } from '../lib/validation'

const progress = new Hono<{ Bindings: Env; Variables: Variables }>()
progress.use('*', attachUser, requireAuth)

progress.post('/questions/:questionId/answer', async (c) => {
  const user = c.var.user!
  const questionId = c.req.param('questionId')
  const body = await parseJsonBody(c, answerSchema)
  if (!body.success) return body.response
  const { optionId } = body.data

  const question = await c.env.DB.prepare('SELECT id, lesson_id, explanation FROM questions WHERE id = ?')
    .bind(questionId)
    .first<{ id: string; lesson_id: string; explanation: string | null }>()
  if (!question) return c.json({ error: 'not_found' }, 404)

  const option = await c.env.DB.prepare('SELECT id, is_correct FROM answer_options WHERE id = ? AND question_id = ?')
    .bind(optionId, questionId)
    .first<{ id: string; is_correct: number }>()
  if (!option) return c.json({ error: 'invalid_option' }, 400)

  const correctOption = await c.env.DB.prepare('SELECT id FROM answer_options WHERE question_id = ? AND is_correct = 1')
    .bind(questionId)
    .first<{ id: string }>()

  const isCorrect = option.is_correct === 1
  let xpAwarded = 0

  if (isCorrect) {
    xpAwarded = xpForCorrectAnswer()
    await c.env.DB.prepare('UPDATE user_stats SET xp_total = xp_total + ? WHERE user_id = ?')
      .bind(xpAwarded, user.userId)
      .run()
    await bumpQuest(c.env, user.userId, 'answer_10_correct', 1)
    await bumpQuest(c.env, user.userId, 'earn_30_xp', xpAwarded)
    await bumpDailyXp(c.env, user.userId, xpAwarded)
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

  // Correctness + explanation are revealed only AFTER answering — the teaching moment.
  return c.json({
    correct: isCorrect,
    xpAwarded,
    correctOptionId: correctOption?.id ?? null,
    explanation: question.explanation,
  })
})

// XP-free exercise check for recycled practice (true/false statements and type-in answers).
// Server-side evaluation keeps the correct answer hidden until the attempt is made.
progress.post('/questions/:questionId/check', async (c) => {
  const user = c.var.user!
  const questionId = c.req.param('questionId')
  const body = await parseJsonBody(c, checkSchema)
  if (!body.success) return body.response
  const { kind } = body.data

  const question = await c.env.DB.prepare('SELECT id, explanation FROM questions WHERE id = ?')
    .bind(questionId)
    .first<{ id: string; explanation: string | null }>()
  if (!question) return c.json({ error: 'not_found' }, 404)

  const { results: options } = await c.env.DB.prepare(
    'SELECT id, label, is_correct FROM answer_options WHERE question_id = ? ORDER BY sort_order',
  )
    .bind(questionId)
    .all<{ id: string; label: string; is_correct: number }>()
  const correctOption = options.find((o) => o.is_correct === 1)
  if (!correctOption) return c.json({ error: 'not_found' }, 404)

  let isCorrect = false
  if (kind === 'truefalse') {
    const { optionId, saysTrue } = body.data
    const option = options.find((o) => o.id === optionId)
    if (!option) return c.json({ error: 'invalid_option' }, 400)
    isCorrect = (option.is_correct === 1) === saysTrue
  } else {
    isCorrect = normalizeAnswer(body.data.text!) === normalizeAnswer(correctOption.label)
  }

  await logEvent(c.env, user.userId, 'exercise_checked', { questionId, kind, isCorrect })

  return c.json({
    correct: isCorrect,
    correctOptionId: correctOption.id,
    correctLabel: correctOption.label,
    explanation: question.explanation,
  })
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

  const stats = await c.env.DB.prepare(
    'SELECT streak_count, last_active_date, streak_freezes FROM user_stats WHERE user_id = ?',
  )
    .bind(user.userId)
    .first<{ streak_count: number; last_active_date: string | null; streak_freezes: number }>()

  const today = todayUtc()
  const nextStreak = nextStreakState(
    { streakCount: stats?.streak_count ?? 0, lastActiveDate: stats?.last_active_date ?? null },
    today,
    stats?.streak_freezes ?? 0,
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
      'UPDATE user_stats SET xp_total = xp_total + ?, streak_count = ?, last_active_date = ?, streak_freezes = streak_freezes - ? WHERE user_id = ?',
    ).bind(bonusXp, nextStreak.streakCount, nextStreak.lastActiveDate, nextStreak.freezesConsumed, user.userId),
  ])

  await bumpQuest(c.env, user.userId, 'finish_1_lesson', 1)
  await bumpQuest(c.env, user.userId, 'earn_30_xp', bonusXp)
  await bumpDailyXp(c.env, user.userId, bonusXp)

  const earnedKeys = await evaluateLessonAchievements(c.env, user.userId, lessonId, score, nextStreak.streakCount)
  const achievementsEarned = ACHIEVEMENTS.filter((a) => earnedKeys.includes(a.key))

  await logEvent(c.env, user.userId, 'lesson_completed', { lessonId, score })

  return c.json({
    score,
    bonusXpAwarded: bonusXp,
    streakCount: nextStreak.streakCount,
    freezesConsumed: nextStreak.freezesConsumed,
    achievementsEarned,
  })
})

export default progress
