import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../src/lib/password'

describe('password hashing (PBKDF2 via Web Crypto)', () => {
  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('produces a different hash (different salt) for the same password each time', async () => {
    const hashA = await hashPassword('same-password')
    const hashB = await hashPassword('same-password')
    expect(hashA).not.toBe(hashB)
    expect(await verifyPassword('same-password', hashA)).toBe(true)
    expect(await verifyPassword('same-password', hashB)).toBe(true)
  })

  it('rejects malformed stored hashes gracefully', async () => {
    expect(await verifyPassword('anything', 'not-a-real-hash')).toBe(false)
  })
})
