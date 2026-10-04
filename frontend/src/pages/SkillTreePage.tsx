import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Quest, type ShopItem, type UnitSummary } from '../api/client'
import { useAppStore } from '../store/useAppStore'

export default function SkillTreePage() {
  const user = useAppStore((s) => s.user)
  const streakCount = useAppStore((s) => s.streakCount)
  const xpTotal = useAppStore((s) => s.xpTotal)
  const gems = useAppStore((s) => s.gems)
  const setUser = useAppStore((s) => s.setUser)
  const setStats = useAppStore((s) => s.setStats)
  const setGems = useAppStore((s) => s.setGems)
  const navigate = useNavigate()

  const [units, setUnits] = useState<UnitSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quests, setQuests] = useState<Quest[] | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [shopItems, setShopItems] = useState<ShopItem[] | null>(null)
  const [shopError, setShopError] = useState<string | null>(null)

  useEffect(() => {
    api
      .units()
      .then(({ units }) => setUnits(units))
      .catch(() => setError('Failed to load units.'))
    api
      .profile()
      .then((p) => setStats({ xpTotal: p.xpTotal, streakCount: p.streakCount, gems: p.gems }))
      .catch(() => {})
    api
      .quests()
      .then(({ gems, quests }) => {
        setQuests(quests)
        setGems(gems)
      })
      .catch(() => {})
  }, [setStats, setGems])

  async function handleLogout() {
    await api.logout().catch(() => {})
    setUser(null)
    navigate('/login')
  }

  async function claimQuest(key: string) {
    try {
      const { gems } = await api.claimQuest(key)
      setGems(gems)
      setQuests((qs) => qs?.map((q) => (q.key === key ? { ...q, claimable: false } : q)) ?? null)
    } catch {
      /* claim races are fine to ignore; the card refreshes on next load */
    }
  }

  async function openShop() {
    setShopOpen(true)
    setShopError(null)
    try {
      const { gems, items } = await api.shop()
      setGems(gems)
      setShopItems(items)
    } catch {
      setShopError('Failed to load shop.')
    }
  }

  async function buy(item: ShopItem) {
    try {
      const { gems, streakFreezes } = await api.purchase(item.key)
      setGems(gems)
      setShopItems((items) =>
        items?.map((i) =>
          i.key === item.key
            ? { ...i, owned: i.key === 'streak_freeze' ? streakFreezes : i.owned }
            : i,
        ) ?? null,
      )
    } catch (e) {
      setShopError(e instanceof Error && e.message === 'max_owned' ? 'You already own the maximum.' : 'Purchase failed.')
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-6 py-12 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.email}</h1>
          <p className="mt-1 text-sm text-slate-500">
            🔥 Streak: {streakCount} &nbsp;·&nbsp; ⭐ XP: {xpTotal} &nbsp;·&nbsp; 💎 {gems}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openShop} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            💎 Shop
          </button>
          <Link to="/league" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            🏆 League
          </Link>
          <Link to="/profile" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            Profile
          </Link>
          <button onClick={handleLogout} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            Log out
          </button>
        </div>
      </div>

      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {quests && quests.length > 0 && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Daily quests</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {quests.map((q) => (
              <li key={q.key} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{q.title}</p>
                    <span className="shrink-0 text-xs text-slate-500">
                      {q.progress}/{q.target} · 💎 {q.gemsReward}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${q.completed ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }}
                    />
                  </div>
                </div>
                {q.claimable && (
                  <button
                    onClick={() => claimQuest(q.key)}
                    className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Claim
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {shopOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShopOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Gem shop"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Gem shop</h2>
              <span className="text-sm text-slate-500">💎 {gems}</span>
            </div>
            {shopError && <p className="mt-3 text-sm text-red-600">{shopError}</p>}
            <ul className="mt-4 flex flex-col gap-3">
              {shopItems?.map((item) => (
                <li key={item.key} className="rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {item.title}
                        {item.owned !== null && item.owned > 0 && (
                          <span className="ml-1 text-xs text-slate-500">(owned: {item.owned})</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                    </div>
                    <button
                      onClick={() => buy(item)}
                      disabled={gems < item.cost || (item.maxOwned !== null && item.owned !== null && item.owned >= item.maxOwned)}
                      className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      💎 {item.cost}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShopOpen(false)}
              className="mt-5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
