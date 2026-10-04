import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Achievement } from '../api/client'
import { useAppStore } from '../store/useAppStore'

type ProfileData = {
  email: string
  xpTotal: number
  streakCount: number
  lastActiveDate: string | null
  emailRemindersEnabled: boolean
  gems: number
  streakFreezes: number
}

export default function ProfilePage() {
  const setStats = useAppStore((s) => s.setStats)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [achievements, setAchievements] = useState<Achievement[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .profile()
      .then((p) => {
        setProfile(p)
        setStats({ xpTotal: p.xpTotal, streakCount: p.streakCount, gems: p.gems })
      })
      .catch(() => setError('Failed to load profile.'))
    api
      .achievements()
      .then(({ achievements }) => setAchievements(achievements))
      .catch(() => {})
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
        <h1 className="font-display text-2xl font-semibold text-white">Your profile</h1>
        <Link to="/" className="text-sm text-faint hover:text-slate-200">
          &larr; Back to units
        </Link>
      </div>

      {error && <p className="mt-6 text-sm text-rose-400">{error}</p>}

      {profile && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="glass px-4 py-3">
            <p className="text-sm text-dim">Email</p>
            <p className="text-base text-white">{profile.email}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="glass px-4 py-3 text-center">
              <p className="text-2xl">⭐ {profile.xpTotal}</p>
              <p className="mt-1 text-sm text-dim">Total XP</p>
            </div>
            <div className="glass px-4 py-3 text-center">
              <p className="text-2xl">🔥 {profile.streakCount}</p>
              <p className="mt-1 text-sm text-dim">Day streak</p>
            </div>
            <div className="glass px-4 py-3 text-center">
              <p className="text-2xl">💎 {profile.gems}</p>
              <p className="mt-1 text-sm text-dim">Gems</p>
            </div>
          </div>

          {achievements && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-dim">Achievements</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {achievements.map((a) => (
                  <div
                    key={a.key}
                    className={`rounded-xl border px-4 py-3 ${
                      a.earnedAt
                        ? 'border-emerald-400/30 bg-emerald-400/10 shadow-[0_0_20px_rgba(52,211,153,0.15)]'
                        : 'border-white/10 bg-white/[0.03] opacity-60'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">
                      {a.earnedAt ? '🏆' : '🔒'} {a.title}
                    </p>
                    <p className="mt-0.5 text-xs text-dim">{a.description}</p>
                    <p className="mt-1 text-xs text-faint">💎 {a.gemsReward}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="glass flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Streak reminder emails</p>
              <p className="text-xs text-dim">
                Get a daily nudge if you haven't practiced yet today.
              </p>
            </div>
            <button
              onClick={toggleReminders}
              disabled={saving}
              aria-pressed={profile.emailRemindersEnabled}
              className={`h-6 w-11 shrink-0 rounded-full border transition-all ${
                profile.emailRemindersEnabled
                  ? 'border-emerald-400/50 bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                  : 'border-white/10 bg-white/10'
              }`}
            >
              <span
                className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform ${
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