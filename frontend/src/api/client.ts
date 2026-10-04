// Thin fetch wrapper for the Hono API — same-origin via Vite dev proxy / single Worker deploy.
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message?: string) {
    super(message ?? code)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (!res.ok) {
    throw new ApiError(res.status, (data.error as string) ?? 'unknown_error', data.message as string | undefined)
  }

  return data as T
}

export type SessionUser = { id: string; email: string }

export type UnitSummary = {
  id: string
  slug: string
  title: string
  locked: boolean
  completed: boolean
  lessonCount: number
  completedLessonCount: number
}

export type LessonSummary = { id: string; title: string; status: string; bestScore: number }

export type LessonQuestion = {
  id: string
  prompt: string
  options: { id: string; label: string }[]
  acceptsTextAnswer: boolean
}

export type LessonDetail = {
  id: string
  unitId: string
  title: string
  conceptMarkdown: string
  questions: LessonQuestion[]
}

export type AnswerResult = {
  correct: boolean
  xpAwarded: number
  correctOptionId: string | null
  explanation: string | null
}

export type CheckResult = {
  correct: boolean
  correctOptionId: string
  correctLabel: string
  explanation: string | null
}

export const api = {
  signup: (email: string, password: string) =>
    request<{ user: SessionUser }>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<{ user: SessionUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  session: () => request<{ user: SessionUser | null }>('/auth/session'),
  units: () => request<{ units: UnitSummary[] }>('/units'),
  unitLessons: (unitId: string) => request<{ lessons: LessonSummary[] }>(`/units/${unitId}/lessons`),
  lesson: (lessonId: string) => request<{ lesson: LessonDetail }>(`/lessons/${lessonId}`),
  startLesson: (lessonId: string) => request<{ ok: true }>(`/lessons/${lessonId}/start`, { method: 'POST' }),
  answerQuestion: (questionId: string, optionId: string) =>
    request<AnswerResult>(`/questions/${questionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    }),
  checkExercise: (
    questionId: string,
    body: { kind: 'truefalse'; optionId: string; saysTrue: boolean } | { kind: 'text'; text: string },
  ) =>
    request<CheckResult>(`/questions/${questionId}/check`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  completeLesson: (lessonId: string, correctCount: number, totalQuestions: number) =>
    request<{ score: number; bonusXpAwarded: number; streakCount: number }>(`/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ correctCount, totalQuestions }),
    }),
  profile: () =>
    request<{
      email: string
      xpTotal: number
      streakCount: number
      lastActiveDate: string | null
      emailRemindersEnabled: boolean
    }>('/profile'),
  updatePreferences: (emailRemindersEnabled: boolean) =>
    request<{ ok: true }>('/profile/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ emailRemindersEnabled }),
    }),
}
