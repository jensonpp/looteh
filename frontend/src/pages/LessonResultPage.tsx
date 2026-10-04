import { useEffect, useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'

type ResultState = {
  score: number
  bonusXpAwarded: number
  streakCount: number
  correctXp: number
  heartsLeft: number
  bestCombo: number
}

const CONFETTI_COLORS = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#f87171']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2.5 + Math.random() * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        round: Math.random() > 0.5,
      })),
    [],
  )
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <style>{`@keyframes fl-confetti-fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animation: `fl-confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

export default function LessonResultPage() {
  const location = useLocation()
  const { lessonId } = useParams<{ lessonId: string }>()
  const setStats = useAppStore((s) => s.setStats)
  const result = location.state as ResultState | null

  useEffect(() => {
    api
      .profile()
      .then((p) => setStats({ xpTotal: p.xpTotal, streakCount: p.streakCount }))
      .catch(() => {})
  }, [setStats])

  if (!result) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-slate-500">No result data — did you land here directly?</p>
        <Link to="/" className="mt-4 underline">
          Back to units
        </Link>
      </div>
    )
  }

  const totalXp = result.correctXp + result.bonusXpAwarded

  return (
    <div className="relative mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      {result.score >= 50 && <Confetti />}
      <h1 className="text-3xl font-semibold text-slate-900">Lesson complete! 🎉</h1>
      <p className="mt-4 text-5xl font-bold text-emerald-600">{result.score}%</p>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">XP earned</p>
        <div className="mt-3 flex justify-between text-slate-700">
          <span>Correct answers</span>
          <span className="font-semibold">+{result.correctXp} XP</span>
        </div>
        <div className="mt-1 flex justify-between text-slate-700">
          <span>Lesson bonus</span>
          <span className="font-semibold">+{result.bonusXpAwarded} XP</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-slate-900">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-emerald-600">+{totalXp} XP</span>
        </div>
      </div>

      <p className="mt-6 text-slate-600">
        ❤️ {result.heartsLeft} hearts left &nbsp;·&nbsp; 🔥 Best combo: {result.bestCombo} &nbsp;·&nbsp; Day streak:{' '}
        {result.streakCount}
      </p>

      <div className="mt-8 flex gap-3">
        <Link to="/" className="rounded-md bg-slate-900 px-4 py-2 text-white">
          Back to units
        </Link>
        {lessonId && (
          <Link to={`/lessons/${lessonId}`} className="rounded-md border border-slate-300 px-4 py-2">
            Retry lesson
          </Link>
        )}
      </div>
    </div>
  )
}
