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

export type StreakResult = {
  streakCount: number
  lastActiveDate: string
  freezesConsumed: number
}

/**
 * Computes the next streak state given the server's current UTC date.
 * - Already active today -> no-op (idempotent on repeated activity same day).
 * - Active yesterday -> increment.
 * - Gap of missed days -> each streak freeze in inventory covers one missed
 *   day; if the user owns enough freezes the streak continues (freezes are
 *   consumed), otherwise it resets to 1.
 */
export function nextStreakState(
  current: StreakState,
  todayUtcDate: string,
  streakFreezesAvailable = 0,
): StreakResult {
  if (current.lastActiveDate === todayUtcDate) {
    return {
      streakCount: current.streakCount,
      lastActiveDate: todayUtcDate,
      freezesConsumed: 0,
    }
  }

  const missedDays = current.lastActiveDate ? daysBetweenUtc(current.lastActiveDate, todayUtcDate) - 1 : 0
  const isConsecutive = current.lastActiveDate === addDaysUtc(todayUtcDate, -1)
  const freezesCoverGap = !isConsecutive && missedDays >= 1 && streakFreezesAvailable >= missedDays

  if (isConsecutive || freezesCoverGap) {
    return {
      streakCount: current.streakCount + 1,
      lastActiveDate: todayUtcDate,
      freezesConsumed: freezesCoverGap ? missedDays : 0,
    }
  }

  return { streakCount: 1, lastActiveDate: todayUtcDate, freezesConsumed: 0 }
}

function addDaysUtc(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysBetweenUtc(fromStr: string, toStr: string): number {
  const from = new Date(`${fromStr}T00:00:00Z`).getTime()
  const to = new Date(`${toStr}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86_400_000)
}
