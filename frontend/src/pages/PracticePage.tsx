import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type LessonQuestion } from '../api/client'

type Feedback = {
  correct: boolean
  xpAwarded: number
  correctOptionId: string | null
  explanation: string | null
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<LessonQuestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api
      .practiceMistakes()
      .then(({ questions }) => setQuestions(questions))
      .catch(() => setError('Failed to load practice questions.'))
  }, [])

  if (error) return <div className="mx-auto max-w-2xl px-6 py-12 text-rose-600">{error}</div>
  if (!questions) return <div className="mx-auto max-w-2xl px-6 py-12 text-slate-500">Loading practice…</div>

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">No mistakes to practice!</h1>
        <p className="mt-2 text-slate-600">
          You haven't missed any questions yet. Keep learning — they'll show up here when you do.
        </p>
        <Link to="/" className="mt-8 rounded-md bg-slate-900 px-4 py-2 text-white">
          Back to the path
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
        <span className="text-6xl">🎯</span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Practice complete!</h1>
        <p className="mt-2 text-slate-600">
          You reviewed {questions.length} question{questions.length === 1 ? '' : 's'} and earned{' '}
          <span className="font-semibold text-slate-900">{xpEarned} XP</span>.
        </p>
        <Link to="/" className="mt-8 rounded-md bg-emerald-600 px-4 py-2 text-white">
          Back to the path
        </Link>
      </div>
    )
  }

  const question = questions[index]
  const progress = (index / questions.length) * 100

  const handleAnswer = async () => {
    if (!selected || submitting || feedback) return
    setSubmitting(true)
    try {
      const res = await api.answerQuestion(question.id, selected)
      setFeedback({
        correct: res.correct,
        xpAwarded: res.xpAwarded,
        correctOptionId: res.correctOptionId,
        explanation: res.explanation,
      })
      setXpEarned((xp) => xp + res.xpAwarded)
    } catch {
      setFeedback({ correct: false, xpAwarded: 0, correctOptionId: null, explanation: null })
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setFeedback(null)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-6 py-12 text-left">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Practice your mistakes</h1>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
          &larr; Back to the path
        </Link>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${feedback ? ((index + 1) / questions.length) * 100 : progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Question {index + 1} of {questions.length} · no hearts, full XP
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 p-6">
        <p className="text-lg font-medium text-slate-900">{question.prompt}</p>
        <ul className="mt-5 flex flex-col gap-3">
          {question.options.map((option) => {
            const isPicked = selected === option.id
            const isCorrectOption = feedback && option.id === feedback.correctOptionId
            return (
              <li key={option.id}>
                <button
                  onClick={() => !feedback && setSelected(option.id)}
                  disabled={Boolean(feedback)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    feedback
                      ? isCorrectOption
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : isPicked
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 text-slate-400'
                      : isPicked
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-slate-300 hover:border-slate-500'
                  }`}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>

        {feedback && (
          <div
            className={`mt-5 rounded-lg px-4 py-3 text-sm ${
              feedback.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
            }`}
          >
            <p className="font-semibold">
              {feedback.correct
                ? `Correct! +${feedback.xpAwarded} XP`
                : `Not quite.${
                    feedback.correctOptionId
                      ? ` The right answer: ${question.options.find((o) => o.id === feedback.correctOptionId)?.label ?? ''}`
                      : ''
                  }`}
            </p>
            {feedback.explanation && <p className="mt-1 text-slate-600">{feedback.explanation}</p>}
          </div>
        )}

        <div className="mt-6">
          {feedback ? (
            <button onClick={handleNext} className="rounded-md bg-slate-900 px-5 py-2.5 text-white">
              {index + 1 >= questions.length ? 'Finish' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleAnswer}
              disabled={!selected || submitting}
              className="rounded-md bg-emerald-600 px-5 py-2.5 text-white disabled:opacity-40"
            >
              {submitting ? 'Checking…' : 'Check'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}