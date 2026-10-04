import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { attachUser, requireAuth } from '../middleware/auth'

const content = new Hono<{ Bindings: Env; Variables: Variables }>()
content.use('*', attachUser, requireAuth)

content.get('/units', async (c) => {
  const user = c.var.user!

  const { results: units } = await c.env.DB.prepare(
    'SELECT id, slug, title, sort_order, unlock_requires_unit_id FROM units ORDER BY sort_order',
  ).all<{ id: string; slug: string; title: string; sort_order: number; unlock_requires_unit_id: string | null }>()

  const { results: completedLessons } = await c.env.DB.prepare(
    `SELECT l.unit_id as unit_id, COUNT(*) as completed_count
     FROM user_lesson_progress p
     JOIN lessons l ON l.id = p.lesson_id
     WHERE p.user_id = ? AND p.status = 'completed'
     GROUP BY l.unit_id`,
  )
    .bind(user.userId)
    .all<{ unit_id: string; completed_count: number }>()

  const { results: lessonCounts } = await c.env.DB.prepare(
    'SELECT unit_id, COUNT(*) as total_count FROM lessons GROUP BY unit_id',
  ).all<{ unit_id: string; total_count: number }>()

  const completedByUnit = new Map(completedLessons.map((r) => [r.unit_id, r.completed_count]))
  const totalByUnit = new Map(lessonCounts.map((r) => [r.unit_id, r.total_count]))
  const unitById = new Map(units.map((u) => [u.id, u]))

  function isUnitComplete(unitId: string): boolean {
    const total = totalByUnit.get(unitId) ?? 0
    const completed = completedByUnit.get(unitId) ?? 0
    return total > 0 && completed >= total
  }

  const result = units.map((unit) => {
    const requiredUnit = unit.unlock_requires_unit_id ? unitById.get(unit.unlock_requires_unit_id) : null
    const locked = requiredUnit ? !isUnitComplete(requiredUnit.id) : false
    return {
      id: unit.id,
      slug: unit.slug,
      title: unit.title,
      locked,
      completed: isUnitComplete(unit.id),
      lessonCount: totalByUnit.get(unit.id) ?? 0,
      completedLessonCount: completedByUnit.get(unit.id) ?? 0,
    }
  })

  return c.json({ units: result })
})

content.get('/units/:unitId/lessons', async (c) => {
  const unitId = c.req.param('unitId')
  const user = c.var.user!

  const { results: lessons } = await c.env.DB.prepare(
    'SELECT id, title, sort_order FROM lessons WHERE unit_id = ? ORDER BY sort_order',
  )
    .bind(unitId)
    .all<{ id: string; title: string; sort_order: number }>()

  const { results: progress } = await c.env.DB.prepare(
    `SELECT lesson_id, status, best_score FROM user_lesson_progress
     WHERE user_id = ? AND lesson_id IN (SELECT id FROM lessons WHERE unit_id = ?)`,
  )
    .bind(user.userId, unitId)
    .all<{ lesson_id: string; status: string; best_score: number }>()

  const progressByLesson = new Map(progress.map((p) => [p.lesson_id, p]))

  return c.json({
    lessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      status: progressByLesson.get(l.id)?.status ?? 'not_started',
      bestScore: progressByLesson.get(l.id)?.best_score ?? 0,
    })),
  })
})

content.get('/lessons/:lessonId', async (c) => {
  const lessonId = c.req.param('lessonId')

  const lesson = await c.env.DB.prepare('SELECT id, unit_id, title, concept_markdown FROM lessons WHERE id = ?')
    .bind(lessonId)
    .first<{ id: string; unit_id: string; title: string; concept_markdown: string }>()

  if (!lesson) return c.json({ error: 'not_found' }, 404)

  const { results: questions } = await c.env.DB.prepare(
    'SELECT id, prompt, sort_order FROM questions WHERE lesson_id = ? ORDER BY sort_order',
  )
    .bind(lessonId)
    .all<{ id: string; prompt: string; sort_order: number }>()

  const { results: options } = await c.env.DB.prepare(
    `SELECT id, question_id, label, sort_order FROM answer_options
     WHERE question_id IN (SELECT id FROM questions WHERE lesson_id = ?) ORDER BY sort_order`,
  )
    .bind(lessonId)
    .all<{ id: string; question_id: string; label: string; sort_order: number }>()
  // Note: `is_correct` is intentionally never selected here — client never learns correctness ahead of answering.

  // Type-in exercises need a short correct answer; compute eligibility server-side from the
  // correct label's length so the client still never learns WHICH option is correct.
  const { results: correctLabelLengths } = await c.env.DB.prepare(
    `SELECT question_id, LENGTH(label) AS len FROM answer_options
     WHERE is_correct = 1 AND question_id IN (SELECT id FROM questions WHERE lesson_id = ?)`,
  )
    .bind(lessonId)
    .all<{ question_id: string; len: number }>()
  const textAnswerEligible = new Set(
    correctLabelLengths.filter((r) => r.len <= 30).map((r) => r.question_id),
  )

  const optionsByQuestion = new Map<string, { id: string; label: string }[]>()
  for (const opt of options) {
    const list = optionsByQuestion.get(opt.question_id) ?? []
    list.push({ id: opt.id, label: opt.label })
    optionsByQuestion.set(opt.question_id, list)
  }

  return c.json({
    lesson: {
      id: lesson.id,
      unitId: lesson.unit_id,
      title: lesson.title,
      conceptMarkdown: lesson.concept_markdown,
      questions: questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: optionsByQuestion.get(q.id) ?? [],
        acceptsTextAnswer: textAnswerEligible.has(q.id),
      })),
    },
  })
})

export default content
