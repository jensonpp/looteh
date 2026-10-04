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
    expect(result).toEqual({ streakCount: 1, lastActiveDate: '2024-01-10' })
  })

  it('increments when active on the consecutive day', () => {
    const result = nextStreakState({ streakCount: 3, lastActiveDate: '2024-01-09' }, '2024-01-10')
    expect(result).toEqual({ streakCount: 4, lastActiveDate: '2024-01-10' })
  })

  it('is idempotent when already active today', () => {
    const result = nextStreakState({ streakCount: 4, lastActiveDate: '2024-01-10' }, '2024-01-10')
    expect(result).toEqual({ streakCount: 4, lastActiveDate: '2024-01-10' })
  })

  it('resets to 1 after a gap of more than one day', () => {
    const result = nextStreakState({ streakCount: 4, lastActiveDate: '2024-01-05' }, '2024-01-10')
    expect(result).toEqual({ streakCount: 1, lastActiveDate: '2024-01-10' })
  })

  it('resets to 1 across a month boundary gap', () => {
    const result = nextStreakState({ streakCount: 2, lastActiveDate: '2024-01-30' }, '2024-03-01')
    expect(result).toEqual({ streakCount: 1, lastActiveDate: '2024-03-01' })
  })

  it('increments correctly across a month boundary when consecutive', () => {
    const result = nextStreakState({ streakCount: 5, lastActiveDate: '2024-01-31' }, '2024-02-01')
    expect(result).toEqual({ streakCount: 6, lastActiveDate: '2024-02-01' })
  })
})
