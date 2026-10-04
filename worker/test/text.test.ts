import { describe, expect, it } from 'vitest'
import { normalizeAnswer } from '../src/lib/text'

describe('normalizeAnswer', () => {
  it('is case-insensitive and collapses whitespace', () => {
    expect(normalizeAnswer('  Emergency   Fund ')).toBe('emergency fund')
  })

  it('strips trailing punctuation but keeps internal punctuation', () => {
    expect(normalizeAnswer('A deductible is...')).toBe('a deductible is')
    expect(normalizeAnswer('3–6 months!')).toBe('3–6 months')
    expect(normalizeAnswer('50/30/20 rule.')).toBe('50/30/20 rule')
  })

  it('leaves already-normalized text unchanged', () => {
    expect(normalizeAnswer('checking')).toBe('checking')
  })

  it('handles punctuation-only input gracefully', () => {
    expect(normalizeAnswer('!!!')).toBe('')
  })
})