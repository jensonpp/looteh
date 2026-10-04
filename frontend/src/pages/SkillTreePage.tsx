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
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-xl opacity-50 grayscale">
          🔒
        </div>
      </div>
    )
  }

  const completed = state === 'completed'
  return (
    <div className="relative mt-6" style={style}>
      {isCurrent && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-gradient-to-r from-emerald-400 to-cyan-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-950 shadow-[0_0_16px_rgba(52,211,153,0.5)]">
          Start
        </span>
      )}
      <Link
        to={`/lessons/${lessonId}`}
        aria-label={`Lesson ${index + 1}${completed ? ' (completed)' : ''}`}
        className={`flex h-16 w-16 items-center justify-center rounded-full border-b-4 text-2xl font-bold transition-all duration-200 hover:scale-110 ${
          completed
            ? 'border-emerald-700 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_24px_rgba(52,211,153,0.45)]'
            : isCurrent
              ? 'pulse-ring border-cyan-300 bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950'
              : 'border-white/10 bg-white/[0.06] text-slate-300 backdrop-blur hover:border-emerald-400/50 hover:text-white hover:shadow-[0_0_20px_rgba(52,211,153,0.25)]'
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
        className="flex items-center justify-between rounded-2xl border border-white/10 px-5 py-3 text-white backdrop-blur"
        style={{
          background: unit.locked
            ? 'rgba(148,163,184,0.15)'
            : `linear-gradient(135deg, ${color}e6, ${color}99)`,
          boxShadow: unit.locked ? 'none' : `0 0 32px ${color}33`,
        }}
      >
        <span className="text-sm font-bold uppercase tracking-widest">
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
                ? 'animate-bounce border-amber-600 bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_32px_rgba(251,191,36,0.5)]'
                : 'border-white/10 bg-white/[0.03] opacity-50 grayscale'
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
          <h1 className="font-display text-2xl font-semibold text-white">Welcome, {user?.email}</h1>
          <p className="mt-1 text-sm text-dim">
            🔥 Streak: {streakCount} &nbsp;·&nbsp; ⭐ XP: {xpTotal} &nbsp;·&nbsp; 💎 {gems}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openShop} className="btn-ghost px-3 py-1.5 text-sm">
            💎 Shop
          </button>
          <Link to="/league" className="btn-ghost px-3 py-1.5 text-sm">
            🏆 League
          </Link>
          <Link to="/practice" className="btn-ghost px-3 py-1.5 text-sm">
            🎯 Practice
          </Link>
          <Link to="/profile" className="btn-ghost px-3 py-1.5 text-sm">
            Profile
          </Link>
          <button onClick={handleLogout} className="btn-ghost px-3 py-1.5 text-sm">
            Log out
          </button>
        </div>
      </div>

      {error && <p className="mt-8 text-sm text-rose-400">{error}</p>}

      {quests && quests.length > 0 && (
        <section className="glass mt-8 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-dim">Daily quests</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {quests.map((q) => (
              <li key={q.key} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{q.title}</p>
                    <span className="shrink-0 text-xs text-faint">
                      {q.progress}/{q.target} · 💎 {q.gemsReward}
                    </span>
                  </div>
                  <div className="progress-track mt-1.5 h-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        q.completed ? 'progress-fill' : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }}
                    />
                  </div>
                </div>
                {q.claimable && (
                  <button
                    onClick={() => claimQuest(q.key)}
                    className="btn-primary shrink-0 px-3 py-1.5 text-xs"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShopOpen(false)}
        >
          <div
            className="glass-strong w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Gem shop"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Gem shop</h2>
              <span className="text-sm text-dim">💎 {gems}</span>
            </div>
            {shopError && <p className="mt-3 text-sm text-rose-400">{shopError}</p>}
            <ul className="mt-4 flex flex-col gap-3">
              {shopItems?.map((item) => (
                <li key={item.key} className="glass px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {item.title}
                        {item.owned !== null && item.owned > 0 && (
                          <span className="ml-1 text-xs text-faint">(owned: {item.owned})</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-dim">{item.description}</p>
                    </div>
                    <button
                      onClick={() => buy(item)}
                      disabled={gems < item.cost || (item.maxOwned !== null && item.owned !== null && item.owned >= item.maxOwned)}
                      className="btn-primary shrink-0 px-3 py-1.5 text-xs"
                    >
                      💎 {item.cost}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShopOpen(false)}
              className="btn-ghost mt-5 w-full px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}