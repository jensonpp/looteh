import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type LessonDetail, type LessonQuestion } from '../api/client'
import { track } from '../lib/analytics'
import ConceptCard from '../components/ConceptCard'

const STARTING_HEARTS = 5

type Exercise =
  | { kind: 'teach'; markdown: string }
  | { kind: 'mcq'; question: LessonQuestion }
  | { kind: 'truefalse'; question: LessonQuestion; statementOptionId: string; statementLabel: string }
  | { kind: 'typein'; question: LessonQuestion }

type Feedback = {
  correct: boolean
  correctLabel: string | null
  explanation: string | null
  xpAwarded: number
}

type PlayerState = {
  stepIndex: number
  hearts: number
  combo: number
  bestCombo: number
  primaryCorrect: number
  selectedOptionId: string | null
  typedText: string
  saysTrue: boolean | null
  feedback: Feedback | null
}

type Action =
  | { type: 'select_option'; optionId: string }
  | { type: 'set_typed'; text: string }
  | { type: 'set_says_true'; value: boolean }
  | {
      type: 'answer_result'
      correct: boolean
      primary: boolean
      xpAwarded: number
      correctLabel: string | null
      explanation: string | null
    }
  | { type: 'continue' }
  | { type: 'retry' }
  | { type: 'refill' }

const initialState: PlayerState = {
  stepIndex: 0,
  hearts: STARTING_HEARTS,
  combo: 0,
  bestCombo: 0,
  primaryCorrect: 0,
  selectedOptionId: null,
  typedText: '',
  saysTrue: null,
  feedback: null,
}

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case 'select_option':
      return { ...state, selectedOptionId: action.optionId }
    case 'set_typed':
      return { ...state, typedText: action.text }
    case 'set_says_true':
      return { ...state, saysTrue: action.value }
    case 'answer_result': {
      const combo = action.correct ? state.combo + 1 : 0
      return {
        ...state,
        hearts: action.correct ? state.hearts : state.hearts - 1,
        combo,
        bestCombo: Math.max(state.bestCombo, combo),
        primaryCorrect: state.primaryCorrect + (action.primary && action.correct ? 1 : 0),
        feedback: {
          correct: action.correct,
          correctLabel: action.correctLabel,
          explanation: action.explanation,
          xpAwarded: action.xpAwarded,
        },
      }
    }
    case 'continue':
      return {
        ...state,
        stepIndex: state.stepIndex + 1,
        selectedOptionId: null,
        typedText: '',
        saysTrue: null,
        feedback: null,
      }
    case 'retry':
      return initialState
    case 'refill':
      return { ...state, hearts: STARTING_HEARTS }
    default:
      return state
  }
}

/**
 * Builds the Duolingo-style step sequence: teach → exercise → teach → exercise …
 * followed by a review round that re-asks each question in a different exercise
 * format (type-in for short answers, true/false otherwise) to reinforce recall.
 */
function buildExercises(lesson: LessonDetail): Exercise[] {
  const blocks = lesson.conceptMarkdown.split('\n\n')
  const mid = Math.ceil(blocks.length / 2)
  const teachChunks =
    blocks.length <= 1
      ? [lesson.conceptMarkdown]
      : [blocks.slice(0, mid).join('\n\n'), blocks.slice(mid).join('\n\n')]

  const exercises: Exercise[] = []
  lesson.questions.forEach((question, i) => {
    if (i < teachChunks.length) exercises.push({ kind: 'teach', markdown: teachChunks[i] })
    exercises.push({ kind: 'mcq', question })
  })
  if (lesson.questions.length < teachChunks.length) {
    exercises.push({ kind: 'teach', markdown: teachChunks[teachChunks.length - 1] })
  }

  for (const question of lesson.questions) {
    if (question.acceptsTextAnswer) {
      exercises.push({ kind: 'typein', question })
    } else {
      const option = question.options[Math.floor(Math.random() * question.options.length)]
      exercises.push({
        kind: 'truefalse',
        question,
        statementOptionId: option.id,
        statementLabel: option.label,
      })
    }
  }
  return exercises
}

export default function LessonPlayerPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [state, dispatch] = useReducer(reducer, initialState)
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [refilling, setRefilling] = useState(false)
  const [refillError, setRefillError] = useState<string | null>(null)

  useEffect(() => {
    if (!lessonId) return
    api.lesson(lessonId).then(({ lesson }) => setLesson(lesson))
    api.startLesson(lessonId).catch(() => {})
    track('lesson_started', { lessonId })
  }, [lessonId])

  const exercises = useMemo(() => (lesson ? buildExercises(lesson) : []), [lesson, retryCount])

  if (!lesson || exercises.length === 0) {
    return <div className="mx-auto flex max-w-2xl flex-1 items-center justify-center px-6">Loading…</div>
  }

  async function handleRefill() {
    if (refilling) return
    setRefilling(true)
    setRefillError(null)
    try {
      await api.purchase('heart_refill')
      dispatch({ type: 'refill' })
      setFailed(false)
    } catch {
      setRefillError('Not enough gems — earn more from quests and achievements.')
    } finally {
      setRefilling(false)
    }
  }

  if (failed) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="text-6xl">💔</span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Out of hearts!</h1>
        <p className="mt-2 text-slate-600">
          You missed {STARTING_HEARTS} exercises. Review the concept and try again — repetition is how it sticks.
        </p>
        {refillError && <p className="mt-3 text-sm text-red-600">{refillError}</p>}
        <div className="mt-8 flex gap-3">
          <button
            onClick={handleRefill}
            disabled={refilling}
            className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Refill hearts (20 💎)
          </button>
          <button
            onClick={() => {
              setFailed(false)
              setRetryCount((c) => c + 1)
              dispatch({ type: 'retry' })
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-white"
          >
            Retry lesson
          </button>
          <Link to="/" className="rounded-md border border-slate-300 px-4 py-2">
            Back to units
          </Link>
        </div>
      </div>
    )
  }

  const exercise = exercises[state.stepIndex]
  const isLastStep = state.stepIndex === exercises.length - 1
  const progress = ((state.stepIndex + (state.feedback ? 1 : 0)) / exercises.length) * 100

  const canCheck =
    exercise.kind === 'teach' ||
    (exercise.kind === 'mcq' && state.selectedOptionId !== null) ||
    (exercise.kind === 'truefalse' && state.saysTrue !== null) ||
    (exercise.kind === 'typein' && state.typedText.trim().length > 0)

  async function handleCheck() {
    if (!canCheck || submitting) return
    setSubmitting(true)
    try {
      if (exercise.kind === 'mcq') {
        const res = await api.answerQuestion(exercise.question.id, state.selectedOptionId!)
        const correctLabel = exercise.question.options.find((o) => o.id === res.correctOptionId)?.label ?? null
        dispatch({
          type: 'answer_result',
          correct: res.correct,
          primary: true,
          xpAwarded: res.xpAwarded,
          correctLabel,
          explanation: res.explanation,
        })
        track('question_answered', { questionId: exercise.question.id, correct: res.correct })
      } else if (exercise.kind === 'truefalse') {
        const res = await api.checkExercise(exercise.question.id, {
          kind: 'truefalse',
          optionId: exercise.statementOptionId,
          saysTrue: state.saysTrue!,
        })
        dispatch({
          type: 'answer_result',
          correct: res.correct,
          primary: false,
          xpAwarded: 0,
          correctLabel: res.correctLabel,
          explanation: res.explanation,
        })
      } else if (exercise.kind === 'typein') {
        const res = await api.checkExercise(exercise.question.id, { kind: 'text', text: state.typedText })
        dispatch({
          type: 'answer_result',
          correct: res.correct,
          primary: false,
          xpAwarded: 0,
          correctLabel: res.correctLabel,
          explanation: res.explanation,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleContinue() {
    if (state.hearts <= 0) {
      setFailed(true)
      return
    }
    if (isLastStep && lessonId) {
      const result = await api.completeLesson(lessonId, state.primaryCorrect, lesson!.questions.length)
      track('lesson_completed', { lessonId, score: result.score })
      navigate(`/lessons/${lessonId}/result`, {
        state: {
          ...result,
          correctXp: state.primaryCorrect * 10,
          heartsLeft: state.hearts,
          bestCombo: state.bestCombo,
        },
      })
    } else {
      dispatch({ type: 'continue' })
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-6 py-8">
      {/* Top bar: quit, progress, hearts */}
      <div className="flex items-center gap-4">
        <Link to="/" aria-label="Quit lesson" className="text-2xl leading-none text-slate-400 hover:text-slate-600">
          ✕
        </Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-lg" aria-label={`${state.hearts} hearts`}>
          {'❤️'.repeat(state.hearts)}
          {'🤍'.repeat(STARTING_HEARTS - state.hearts)}
        </span>
      </div>

      {state.combo >= 2 && !state.feedback && (
        <p className="mt-3 self-center text-sm font-semibold text-orange-500">🔥 {state.combo} in a row!</p>
      )}

      {/* Exercise */}
      <div className="mt-8 flex flex-1 flex-col">
        {exercise.kind === 'teach' && (
          <>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-600">Learn</p>
            <ConceptCard markdown={exercise.markdown} />
          </>
        )}

        {exercise.kind === 'mcq' && (
          <>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-600">Check yourself</p>
            <h2 className="text-xl font-semibold text-slate-900">{exercise.question.prompt}</h2>
            <div className="mt-6 flex flex-col gap-3">
              {exercise.question.options.map((option) => {
                const selected = state.selectedOptionId === option.id
                const isCorrectOption = state.feedback && option.label === state.feedback.correctLabel
                const isSelectedWrong = selected && state.feedback && !state.feedback.correct
                return (
                  <button
                    key={option.id}
                    disabled={state.feedback !== null}
                    onClick={() => dispatch({ type: 'select_option', optionId: option.id })}
                    className={`rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                      isCorrectOption
                        ? 'border-emerald-500 bg-emerald-50'
                        : isSelectedWrong
                          ? 'border-red-400 bg-red-50'
                          : selected
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {exercise.kind === 'truefalse' && (
          <>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Review — true or false
            </p>
            <h2 className="text-xl font-semibold text-slate-900">{exercise.question.prompt}</h2>
            <blockquote className="mt-4 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-lg text-slate-800">
              “{exercise.statementLabel}”
            </blockquote>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                disabled={state.feedback !== null}
                onClick={() => dispatch({ type: 'set_says_true', value: false })}
                className={`rounded-xl border-2 px-4 py-4 text-lg font-semibold transition-colors ${
                  state.saysTrue === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-700 hover:border-red-300'
                }`}
              >
                False
              </button>
              <button
                disabled={state.feedback !== null}
                onClick={() => dispatch({ type: 'set_says_true', value: true })}
                className={`rounded-xl border-2 px-4 py-4 text-lg font-semibold transition-colors ${
                  state.saysTrue === true
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-700 hover:border-emerald-300'
                }`}
              >
                True
              </button>
            </div>
          </>
        )}

        {exercise.kind === 'typein' && (
          <>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Review — type the answer
            </p>
            <h2 className="text-xl font-semibold text-slate-900">{exercise.question.prompt}</h2>
            <input
              type="text"
              value={state.typedText}
              disabled={state.feedback !== null}
              onChange={(e) => dispatch({ type: 'set_typed', text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCheck()
              }}
              placeholder="Type your answer…"
              className="mt-6 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg focus:border-slate-900 focus:outline-none disabled:bg-slate-50"
            />
          </>
        )}
      </div>

      {/* Bottom: feedback panel or action button */}
      {state.feedback ? (
        <div className={`mt-6 rounded-2xl p-5 ${state.feedback.correct ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{state.feedback.correct ? '✅' : '❌'}</span>
            <div className="flex-1">
              <p className={`font-semibold ${state.feedback.correct ? 'text-emerald-700' : 'text-red-700'}`}>
                {state.feedback.correct
                  ? state.feedback.xpAwarded > 0
                    ? `Correct! +${state.feedback.xpAwarded} XP`
                    : 'Correct!'
                  : state.feedback.correctLabel
                    ? `Correct answer: ${state.feedback.correctLabel}`
                    : 'Not quite.'}
              </p>
              {state.feedback.explanation && (
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{state.feedback.explanation}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleContinue}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
          >
            {state.hearts <= 0 ? 'See results' : isLastStep ? 'Finish lesson' : 'Continue'}
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <button
            onClick={exercise.kind === 'teach' ? handleContinue : handleCheck}
            disabled={exercise.kind !== 'teach' && (!canCheck || submitting)}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Checking…' : exercise.kind === 'teach' ? 'Got it' : 'Check'}
          </button>
        </div>
      )}
    </div>
  )
}
