import { describe, expect, it } from 'vitest'
import { nextStreakState, xpForCorrectAnswer, xpForLessonComplete } from '../src/lib/gamification'

describe('gamification: XP', () => {
  it('awards fixed XP per correct answer', () => {
    expect(xpForCorrectAnswer()).toBe(10)
  })

  it('awards fixed lesson-complete bonus', () => {
    expect(xpForLessonComplete()).toBe(20)
  })
})

describe('gamification: streak', () => {
  it('starts a new streak at 1 on first-ever activity', () => {
    const result = nextStreakState({ streakCount: 0, lastActiveDate: null }, '2024-01-10')
    expect(result).toEqual({ streakCount: 1, lastActiveDate: '2024-01-10', freezesConsumed: 0 })
  })

  it('increments when active on the consecutive day', () => {
    const result = nextStreakState({ streakCount: 3, lastActiveDate: '2024-01-09' }, '2024-01-10')
    expect(result).toEqual({ streakCount: 4, lastActiveDate: '2024-01-10', freezesConsumed: 0 })
  })

  it('is idempotent when already active today', () => {
    const result = nextStreakState({ streakCount: 4, lastActiveDate: '2024-01-10' }, '2024-01-10')
    expect(result).toEqual({ streakCount: 4, lastActiveDate: '2024-01-10', freezesConsumed: 0 })
  })

  it('resets to 1 after a gap of more than one day', () => {
    const result = nextStreakState({ streakCount: 4, lastActiveDate: '2024-01-05' }, '2024-01-10')
    expect(result).toEqual({ streakCount: 1, lastActiveDate: '2024-01-10', freezesConsumed: 0 })
  })

  it('resets to 1 across a month boundary gap', () => {
    const result = nextStreakState({ streakCount: 2, lastActiveDate: '2024-01-30' }, '2024-03-01')
    expect(result).toEqual({ streakCount: 1, lastActiveDate: '2024-03-01', freezesConsumed: 0 })
  })

  it('increments correctly across a month boundary when consecutive', () => {
    const result = nextStreakState({ streakCount: 5, lastActiveDate: '2024-01-31' }, '2024-02-01')
    expect(result).toEqual({ streakCount: 6, lastActiveDate: '2024-02-01', freezesConsumed: 0 })
  })

  it('consumes one freeze to cover a single missed day', () => {
    const result = nextStreakState({ streakCount: 4, lastActiveDate: '2024-01-08' }, '2024-01-10', 1)
    expect(result).toEqual({ streakCount: 5, lastActiveDate: '2024-01-10', freezesConsumed: 1 })
  })

  it('stacks freezes to cover a multi-day gap', () => {
    const result = nextStreakState({ streakCount: 4, lastActiveDate: '2024-01-05' }, '2024-01-10', 4)
    expect(result).toEqual({ streakCount: 5, lastActiveDate: '2024-01-10', freezesConsumed: 4 })
  })

  it('resets when freezes do not cover the full gap', () => {
    const result = nextStreakState({ streakCount: 4, lastActiveDate: '2024-01-05' }, '2024-01-10', 3)
    expect(result).toEqual({ streakCount: 1, lastActiveDate: '2024-01-10', freezesConsumed: 0 })
  })

  it('does not consume a freeze when the gap is only one day', () => {
    const result = nextStreakState({ streakCount: 4, lastActiveDate: '2024-01-09' }, '2024-01-10', 2)
    expect(result).toEqual({ streakCount: 5, lastActiveDate: '2024-01-10', freezesConsumed: 0 })
  })
})
