import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type LeagueBoard, type LeagueRow } from '../api/client'

const TIER_META: Record<LeagueBoard['tier'], { title: string; emoji: string; color: string }> = {
  bronze: { title: 'Bronze', emoji: '🥉', color: '#b45309' },
  silver: { title: 'Silver', emoji: '🥈', color: '#64748b' },
  gold: { title: 'Gold', emoji: '🥇', color: '#d97706' },
  platinum: { title: 'Platinum', emoji: '🏆', color: '#0e7490' },
  diamond: { title: 'Diamond', emoji: '💎', color: '#7c3aed' },
}

const PROMOTE_COUNT = 7
const DEMOTE_COUNT = 5
const LEAGUE_SIZE = 30

function daysLeftInWeek(): number {
  const now = new Date()
  const dow = now.getUTCDay()
  const daysToMonday = dow === 0 ? 1 : 8 - dow
  return daysToMonday
}

function Row({ row, rank }: { row: LeagueRow; rank: number }) {
  const zone =
    rank <= PROMOTE_COUNT
      ? 'border-l-4 border-emerald-400'
      : rank > LEAGUE_SIZE - DEMOTE_COUNT
        ? 'border-l-4 border-rose-400'
        : 'border-l-4 border-transparent'
  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 backdrop-blur ${zone} ${
        row.isMe
          ? 'bg-cyan-400/10 ring-1 ring-cyan-400/30'
          : 'glass'
      }`}
    >
      <span className="w-6 text-center text-sm font-semibold text-faint">{rank}</span>
      <span className="flex-1 truncate text-sm font-medium text-white">
        {row.name}
        {row.isMe && <span className="ml-1 text-xs font-semibold text-cyan-300">(you)</span>}
      </span>
      <span className="text-sm font-semibold text-slate-300">{row.xp} XP</span>
    </li>
  )
}

export default function LeaguePage() {
  const [board, setBoard] = useState<LeagueBoard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .league()
      .then(setBoard)
      .catch(() => setError('Failed to load league.'))
  }, [])

  if (error) return <div className="mx-auto max-w-2xl px-6 py-12 text-rose-400">{error}</div>
  if (!board) return <div className="mx-auto max-w-2xl px-6 py-12 text-dim">Loading league…</div>

  const meta = TIER_META[board.tier]
  const daysLeft = daysLeftInWeek()

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-6 py-12 text-left">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-white">Weekly league</h1>
        <Link to="/" className="text-sm text-faint hover:text-slate-200">
          &larr; Back to units
        </Link>
      </div>

      <div
        className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 px-6 py-5 text-white backdrop-blur"
        style={{
          background: `linear-gradient(135deg, ${meta.color}e6, ${meta.color}99)`,
          boxShadow: `0 0 40px ${meta.color}40`,
        }}
      >
        <span className="text-4xl drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">{meta.emoji}</span>
        <div>
          <p className="font-display text-lg font-bold">{meta.title} League</p>
          <p className="text-sm text-white/80">
            {daysLeft === 1 ? 'Ends tomorrow' : `${daysLeft} days left`} · Top {PROMOTE_COUNT} promote, bottom{' '}
            {DEMOTE_COUNT} demote
          </p>
          {board.myRank && (
            <p className="mt-1 text-sm font-semibold">
              Your rank: #{board.myRank} of {board.rows.length}
            </p>
          )}
        </div>
      </div>

      {board.rows.length === 0 ? (
        <p className="mt-8 text-dim">
          No one has earned XP in this league yet this week. Complete a lesson to take the top spot!
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {board.rows.map((row, i) => (
            <Row key={row.userId} row={row} rank={i + 1} />
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-faint">
        Leagues reset every Monday (UTC). Earn XP from lessons and exercises to climb — the top {PROMOTE_COUNT}{' '}
        move up a tier, the bottom {DEMOTE_COUNT} move down.
      </p>
    </div>
  )
}