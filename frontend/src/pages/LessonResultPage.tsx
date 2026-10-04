import { useEffect, useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api, type AchievementEarned } from '../api/client'
import { useAppStore } from '../store/useAppStore'

type ResultState = {
  score: number
  bonusXpAwarded: number
  streakCount: number
  correctXp: number
  heartsLeft: number
  bestCombo: number
  achievementsEarned?: AchievementEarned[]
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
      .then((p) => setStats({ xpTotal: p.xpTotal, streakCount: p.streakCount, gems: p.gems }))
      .catch(() => {})
  }, [setStats])

  if (!result) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-dim">No result data — did you land here directly?</p>
        <Link to="/" className="mt-4 text-cyan-300 underline hover:text-cyan-200">
          Back to units
        </Link>
      </div>
    )
  }

  const totalXp = result.correctXp + result.bonusXpAwarded

  return (
    <div className="relative mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      {result.score >= 50 && <Confetti />}
      <h1 className="font-display text-3xl font-semibold text-white">Lesson complete! 🎉</h1>
      <p className="glow-text mt-4 text-5xl font-bold text-emerald-400">{result.score}%</p>

      <div className="glass mt-8 w-full max-w-sm p-5 text-left">
        <p className="text-sm font-semibold uppercase tracking-widest text-dim">XP earned</p>
        <div className="mt-3 flex justify-between text-slate-300">
          <span>Correct answers</span>
          <span className="font-semibold">+{result.correctXp} XP</span>
        </div>
        <div className="mt-1 flex justify-between text-slate-300">
          <span>Lesson bonus</span>
          <span className="font-semibold">+{result.bonusXpAwarded} XP</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-white">
          <span className="font-semibold">Total</span>
          <span className="glow-text font-bold text-emerald-400">+{totalXp} XP</span>
        </div>
      </div>

      <p className="mt-6 text-dim">
        ❤️ {result.heartsLeft} hearts left &nbsp;·&nbsp; 🔥 Best combo: {result.bestCombo} &nbsp;·&nbsp; Day streak:{' '}
        {result.streakCount}
      </p>

      {result.achievementsEarned && result.achievementsEarned.length > 0 && (
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-left shadow-[0_0_24px_rgba(52,211,153,0.15)]">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Achievements unlocked!</p>
          <ul className="mt-3 flex flex-col gap-2">
            {result.achievementsEarned.map((a) => (
              <li key={a.key} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white">🏆 {a.title}</span>
                <span className="text-xs text-dim">+{a.gemsReward} 💎</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Link to="/" className="btn-primary px-4 py-2.5">
          Back to units
        </Link>
        {lessonId && (
          <Link to={`/lessons/${lessonId}`} className="btn-ghost px-4 py-2.5">
            Retry lesson
          </Link>
        )}
      </div>
    </div>
  )
}