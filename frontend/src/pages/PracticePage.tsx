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

  if (error) return <div className="mx-auto max-w-2xl px-6 py-12 text-rose-400">{error}</div>
  if (!questions) return <div className="mx-auto max-w-2xl px-6 py-12 text-dim">Loading practice…</div>

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="font-display mt-4 text-2xl font-semibold text-white">No mistakes to practice!</h1>
        <p className="mt-2 text-dim">
          You haven't missed any questions yet. Keep learning — they'll show up here when you do.
        </p>
        <Link to="/" className="btn-ghost mt-8 px-4 py-2.5">
          Back to the path
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
        <span className="text-6xl">🎯</span>
        <h1 className="font-display mt-4 text-2xl font-semibold text-white">Practice complete!</h1>
        <p className="mt-2 text-dim">
          You reviewed {questions.length} question{questions.length === 1 ? '' : 's'} and earned{' '}
          <span className="glow-text font-semibold text-emerald-400">{xpEarned} XP</span>.
        </p>
        <Link to="/" className="btn-primary mt-8 px-4 py-2.5">
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
        <h1 className="font-display text-2xl font-semibold text-white">Practice your mistakes</h1>
        <Link to="/" className="text-sm text-faint hover:text-slate-200">
          &larr; Back to the path
        </Link>
      </div>

      <div className="progress-track mt-4 h-2">
        <div
          className="progress-fill h-full transition-all"
          style={{ width: `${feedback ? ((index + 1) / questions.length) * 100 : progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-faint">
        Question {index + 1} of {questions.length} · no hearts, full XP
      </p>

      <div className="glass mt-8 p-6">
        <p className="text-lg font-medium text-white">{question.prompt}</p>
        <ul className="mt-5 flex flex-col gap-3">
          {question.options.map((option) => {
            const isPicked = selected === option.id
            const isCorrectOption = feedback && option.id === feedback.correctOptionId
            return (
              <li key={option.id}>
                <button
                  onClick={() => !feedback && setSelected(option.id)}
                  disabled={Boolean(feedback)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all duration-150 ${
                    feedback
                      ? isCorrectOption
                        ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.2)]'
                        : isPicked
                          ? 'border-rose-400/60 bg-rose-400/15 text-rose-200'
                          : 'border-white/10 text-slate-500 opacity-60'
                      : isPicked
                        ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                        : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-400/40 hover:bg-white/[0.07]'
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
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              feedback.correct
                ? 'border-emerald-400/30 bg-emerald-950/40 text-emerald-200'
                : 'border-rose-400/30 bg-rose-950/40 text-rose-200'
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
            {feedback.explanation && <p className="mt-1 text-slate-300">{feedback.explanation}</p>}
          </div>
        )}

        <div className="mt-6">
          {feedback ? (
            <button onClick={handleNext} className="btn-primary px-5 py-2.5">
              {index + 1 >= questions.length ? 'Finish' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleAnswer}
              disabled={!selected || submitting}
              className="btn-primary px-5 py-2.5 disabled:opacity-40"
            >
              {submitting ? 'Checking…' : 'Check'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}