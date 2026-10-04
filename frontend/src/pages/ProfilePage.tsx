import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'

type ProfileData = {
  email: string
  xpTotal: number
  streakCount: number
  lastActiveDate: string | null
  emailRemindersEnabled: boolean
}

export default function ProfilePage() {
  const setStats = useAppStore((s) => s.setStats)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .profile()
      .then((p) => {
        setProfile(p)
        setStats({ xpTotal: p.xpTotal, streakCount: p.streakCount })
      })
      .catch(() => setError('Failed to load profile.'))
  }, [setStats])

  async function toggleReminders() {
    if (!profile) return
    const next = !profile.emailRemindersEnabled
    setProfile({ ...profile, emailRemindersEnabled: next })
    setSaving(true)
    try {
      await api.updatePreferences(next)
    } catch {
      setProfile({ ...profile, emailRemindersEnabled: !next })
      setError('Failed to save preference.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-6 py-12 text-left">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Your profile</h1>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
          &larr; Back to units
        </Link>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {profile && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="rounded-lg border border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-500">Email</p>
            <p className="text-base text-slate-900">{profile.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 px-4 py-3 text-center">
              <p className="text-2xl">⭐ {profile.xpTotal}</p>
              <p className="mt-1 text-sm text-slate-500">Total XP</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3 text-center">
              <p className="text-2xl">🔥 {profile.streakCount}</p>
              <p className="mt-1 text-sm text-slate-500">Day streak</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Streak reminder emails</p>
              <p className="text-xs text-slate-500">
                Get a daily nudge if you haven't practiced yet today.
              </p>
            </div>
            <button
              onClick={toggleReminders}
              disabled={saving}
              aria-pressed={profile.emailRemindersEnabled}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${
                profile.emailRemindersEnabled ? 'bg-slate-900' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${
                  profile.emailRemindersEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
