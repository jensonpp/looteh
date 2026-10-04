import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'

export default function SkillTreePage() {
  const user = useAppStore((s) => s.user)
  const streakCount = useAppStore((s) => s.streakCount)
  const xpTotal = useAppStore((s) => s.xpTotal)
  const setUser = useAppStore((s) => s.setUser)
  const navigate = useNavigate()

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
        <button onClick={handleLogout} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          Log out
        </button>
      </div>
      <p className="mt-10 text-slate-500">
        Skill tree / lesson content lands here in Milestone 8, once Milestone 4's seed content exists.
      </p>
    </div>
  )
}
