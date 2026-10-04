import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type UnitSummary } from '../api/client'
import { useAppStore } from '../store/useAppStore'

export default function SkillTreePage() {
  const user = useAppStore((s) => s.user)
  const streakCount = useAppStore((s) => s.streakCount)
  const xpTotal = useAppStore((s) => s.xpTotal)
  const setUser = useAppStore((s) => s.setUser)
  const setStats = useAppStore((s) => s.setStats)
  const navigate = useNavigate()

  const [units, setUnits] = useState<UnitSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .units()
      .then(({ units }) => setUnits(units))
      .catch(() => setError('Failed to load units.'))
    api
      .profile()
      .then((p) => setStats({ xpTotal: p.xpTotal, streakCount: p.streakCount }))
      .catch(() => {})
  }, [setStats])

  async function handleLogout() {
    await api.logout().catch(() => {})
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-6 py-12 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.email}</h1>
          <p className="mt-1 text-sm text-slate-500">
            🔥 Streak: {streakCount} &nbsp;·&nbsp; ⭐ XP: {xpTotal}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/profile" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            Profile
          </Link>
          <button onClick={handleLogout} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            Log out
          </button>
        </div>
      </div>

      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      <ul className="mt-10 flex flex-col gap-3">
        {units?.map((unit) => (
          <li key={unit.id}>
            {unit.locked ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-400">
                <span>🔒 {unit.title}</span>
                <span className="text-xs">Locked</span>
              </div>
            ) : (
              <Link
                to={`/units/${unit.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-300 px-4 py-3 hover:border-slate-900"
              >
                <span>{unit.completed ? '✅' : '📘'} {unit.title}</span>
                <span className="text-xs text-slate-500">
                  {unit.completedLessonCount}/{unit.lessonCount} lessons
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
