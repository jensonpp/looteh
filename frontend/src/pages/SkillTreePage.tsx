import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Quest, type ShopItem, type TreeUnit } from '../api/client'
import { useAppStore } from '../store/useAppStore'

const UNIT_COLORS = ['#34d399', '#38bdf8', '#a78bfa', '#fbbf24', '#fb7185']
/** Horizontal offsets (as % of path width) the nodes wind through. */
const NODE_OFFSETS = [6, 28, 50, 28]

function LessonNode({
  lessonId,
  index,
  offset,
  state,
  isCurrent,
}: {
  lessonId: string
  index: number
  offset: number
  state: 'completed' | 'playable' | 'locked'
  isCurrent: boolean
}) {
  const style = { marginLeft: `${offset}%` }

  if (state === 'locked') {
    return (
      <div className="mt-6" style={style}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-xl text-slate-400">
          🔒
        </div>
      </div>
    )
  }

  const completed = state === 'completed'
  return (
    <div className="relative mt-6" style={style}>
      {isCurrent && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Start
        </span>
      )}
      <Link
        to={`/lessons/${lessonId}`}
        aria-label={`Lesson ${index + 1}${completed ? ' (completed)' : ''}`}
        className={`flex h-16 w-16 items-center justify-center rounded-full border-b-4 text-2xl font-bold transition-transform hover:scale-105 ${
          completed
            ? 'border-emerald-700 bg-emerald-500 text-white'
            : isCurrent
              ? 'border-sky-600 bg-white text-sky-600 ring-4 ring-sky-200'
              : 'border-slate-300 bg-white text-slate-400'
        }`}
      >
        {completed ? '✓' : '★'}
      </Link>
    </div>
  )
}

function UnitSection({
  unit,
  colorIndex,
  currentLessonId,
}: {
  unit: TreeUnit
  colorIndex: number
  currentLessonId: string | null
}) {
  const color = UNIT_COLORS[colorIndex % UNIT_COLORS.length]
  const done = unit.lessons.filter((l) => l.status === 'completed').length

  return (
    <section className="mt-10">
      <div
        className="flex items-center justify-between rounded-xl px-5 py-3 text-white"
        style={{ background: unit.locked ? '#94a3b8' : color }}
      >
        <span className="text-sm font-bold uppercase tracking-wide">
          {unit.locked ? `🔒 ${unit.title}` : unit.title}
        </span>
        <span className="text-xs font-semibold text-white/85">
          {done}/{unit.lessons.length}
        </span>
      </div>

      <div className="px-2">
        {unit.lessons.map((lesson, i) => {
          const state = unit.locked
            ? 'locked'
            : lesson.status === 'completed'
              ? 'completed'
              : 'playable'
          return (
            <LessonNode
              key={lesson.id}
              lessonId={lesson.id}
              index={i}
              offset={NODE_OFFSETS[i % NODE_OFFSETS.length]}
              state={state}
              isCurrent={lesson.id === currentLessonId}
            />
          )
        })}

        {/* Unit-end chest — lights up when every lesson is done (unit champion). */}
        <div className="mt-6" style={{ marginLeft: `${NODE_OFFSETS[1]}%` }}>
          <div
            title={unit.completed ? 'Unit champion — chest unlocked!' : 'Complete every lesson to open the chest'}
            className={`flex h-16 w-16 items-center justify-center rounded-full border-b-4 text-3xl ${
              unit.completed
                ? 'animate-bounce border-amber-600 bg-amber-400 shadow-lg shadow-amber-200'
                : 'border-slate-200 bg-slate-100 opacity-60 grayscale'
            }`}
          >
            🎁
          </div>
        </div>
      </div>
    </section>
  )
}

export default function SkillTreePage() {
  const user = useAppStore((s) => s.user)
  const streakCount = useAppStore((s) => s.streakCount)
  const xpTotal = useAppStore((s) => s.xpTotal)
  const gems = useAppStore((s) => s.gems)
  const setUser = useAppStore((s) => s.setUser)
  const setStats = useAppStore((s) => s.setStats)
  const setGems = useAppStore((s) => s.setGems)
  const navigate = useNavigate()

  const [tree, setTree] = useState<TreeUnit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quests, setQuests] = useState<Quest[] | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [shopItems, setShopItems] = useState<ShopItem[] | null>(null)
  const [shopError, setShopError] = useState<string | null>(null)

  useEffect(() => {
    api
      .tree()
      .then(({ tree }) => setTree(tree))
      .catch(() => setError('Failed to load the path.'))
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

  // The "Start" flag sits on the first incomplete lesson of the first unlocked unit.
  const currentLessonId =
    tree?.find((u) => !u.locked && u.lessons.some((l) => l.status !== 'completed'))?.lessons.find(
      (l) => l.status !== 'completed',
    )?.id ?? null

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

      {tree?.map((unit, i) => (
        <UnitSection key={unit.id} unit={unit} colorIndex={i} currentLessonId={currentLessonId} />
      ))}

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