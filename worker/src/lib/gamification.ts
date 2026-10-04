// Pure, testable gamification functions — v1 scope is XP + streak only.
// Hearts/badges are deferred to v2 (see project plan); keep this module structured
// so those can be added as additional pure functions later without reworking this logic.

export const XP_PER_CORRECT_ANSWER = 10
export const XP_LESSON_COMPLETE_BONUS = 20

export function xpForCorrectAnswer(): number {
  return XP_PER_CORRECT_ANSWER
}

export function xpForLessonComplete(): number {
  return XP_LESSON_COMPLETE_BONUS
}

export type StreakState = {
  streakCount: number
  lastActiveDate: string | null // YYYY-MM-DD, server UTC date
}

/**
 * Computes the next streak state given the server's current UTC date.
 * - Already active today -> no-op (idempotent on repeated activity same day).
 * - Active yesterday -> increment.
 * - Any other gap (or first-ever activity) -> reset to 1.
 */
export function nextStreakState(current: StreakState, todayUtcDate: string): StreakState {
  if (current.lastActiveDate === todayUtcDate) {
    return current
  }

  const yesterday = addDaysUtc(todayUtcDate, -1)
  const isConsecutive = current.lastActiveDate === yesterday

  return {
    streakCount: isConsecutive ? current.streakCount + 1 : 1,
    lastActiveDate: todayUtcDate,
  }
}

function addDaysUtc(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
