import { describe, expect, it } from 'vitest'
import {
  answerSchema,
  checkSchema,
  lessonCompleteSchema,
  loginSchema,
  preferencesSchema,
  signupSchema,
} from '../src/lib/validation'

describe('validation: signup', () => {
  it('accepts a valid email and 8+ char password, normalizing the email', () => {
    const result = signupSchema.safeParse({ email: '  User@Example.COM ', password: 'hunter22bob' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('user@example.com')
  })

  it('rejects a malformed email', () => {
    expect(signupSchema.safeParse({ email: 'not-an-email', password: 'longenough1' }).success).toBe(false)
  })

  it('rejects a password shorter than 8 chars', () => {
    expect(signupSchema.safeParse({ email: 'a@b.co', password: 'short' }).success).toBe(false)
  })

  it('rejects non-string types', () => {
    expect(signupSchema.safeParse({ email: 42, password: 'longenough1' }).success).toBe(false)
    expect(signupSchema.safeParse({ email: 'a@b.co', password: null }).success).toBe(false)
  })
})

describe('validation: login', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'x' }).success).toBe(true)
  })

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: '' }).success).toBe(false)
  })
})

describe('validation: answer', () => {
  it('accepts a non-empty optionId', () => {
    expect(answerSchema.safeParse({ optionId: 'abc-123' }).success).toBe(true)
  })

  it('rejects a missing or empty optionId', () => {
    expect(answerSchema.safeParse({}).success).toBe(false)
    expect(answerSchema.safeParse({ optionId: '' }).success).toBe(false)
  })
})

describe('validation: exercise check', () => {
  it('accepts a truefalse check with optionId and saysTrue', () => {
    const result = checkSchema.safeParse({ kind: 'truefalse', optionId: 'abc-123', saysTrue: true })
    expect(result.success).toBe(true)
  })

  it('accepts a text check with non-empty text, trimming it', () => {
    const result = checkSchema.safeParse({ kind: 'text', text: '  emergency fund ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.text).toBe('emergency fund')
  })

  it('rejects truefalse missing optionId or saysTrue', () => {
    expect(checkSchema.safeParse({ kind: 'truefalse', optionId: 'abc' }).success).toBe(false)
    expect(checkSchema.safeParse({ kind: 'truefalse', saysTrue: true }).success).toBe(false)
  })

  it('rejects text kind without text', () => {
    expect(checkSchema.safeParse({ kind: 'text' }).success).toBe(false)
    expect(checkSchema.safeParse({ kind: 'text', text: '' }).success).toBe(false)
  })

  it('rejects unknown kinds and non-boolean saysTrue', () => {
    expect(checkSchema.safeParse({ kind: 'matching' }).success).toBe(false)
    expect(checkSchema.safeParse({ kind: 'truefalse', optionId: 'a', saysTrue: 'yes' }).success).toBe(false)
  })
})

describe('validation: lesson complete', () => {
  it('accepts non-negative integers', () => {
    const result = lessonCompleteSchema.safeParse({ correctCount: 2, totalQuestions: 4 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ correctCount: 2, totalQuestions: 4 })
  })

  it('defaults missing counts to 0 (preserves pre-zod behavior)', () => {
    const result = lessonCompleteSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ correctCount: 0, totalQuestions: 0 })
  })

  it('rejects negative, fractional, or non-number counts', () => {
    expect(lessonCompleteSchema.safeParse({ correctCount: -1, totalQuestions: 4 }).success).toBe(false)
    expect(lessonCompleteSchema.safeParse({ correctCount: 1.5, totalQuestions: 4 }).success).toBe(false)
    expect(lessonCompleteSchema.safeParse({ correctCount: '2', totalQuestions: 4 }).success).toBe(false)
  })
})

describe('validation: preferences', () => {
  it('accepts a boolean', () => {
    expect(preferencesSchema.safeParse({ emailRemindersEnabled: false }).success).toBe(true)
  })

  it('rejects truthy non-booleans like 1 or "true"', () => {
    expect(preferencesSchema.safeParse({ emailRemindersEnabled: 1 }).success).toBe(false)
    expect(preferencesSchema.safeParse({ emailRemindersEnabled: 'true' }).success).toBe(false)
    expect(preferencesSchema.safeParse({}).success).toBe(false)
  })
})