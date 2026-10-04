import { describe, expect, it } from 'vitest'
import { signSessionJwt, verifySessionJwt } from '../src/lib/jwt'

const SECRET = 'test-secret'

describe('session JWT (HS256 via Web Crypto)', () => {
  it('round-trips a valid token', async () => {
    const token = await signSessionJwt({ sub: 'user-1', sid: 'session-1' }, SECRET)
    const payload = await verifySessionJwt(token, SECRET)
    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('user-1')
    expect(payload?.sid).toBe('session-1')
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await signSessionJwt({ sub: 'user-1', sid: 'session-1' }, SECRET)
    const payload = await verifySessionJwt(token, 'wrong-secret')
    expect(payload).toBeNull()
  })

  it('rejects a tampered payload', async () => {
    const token = await signSessionJwt({ sub: 'user-1', sid: 'session-1' }, SECRET)
    const [header, , signature] = token.split('.')
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'attacker', sid: 'session-1', iat: 0, exp: 9999999999 }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const tamperedToken = `${header}.${tamperedPayload}.${signature}`
    expect(await verifySessionJwt(tamperedToken, SECRET)).toBeNull()
  })

  it('rejects an expired token', async () => {
    const token = await signSessionJwt({ sub: 'user-1', sid: 'session-1' }, SECRET)
    const [header, payload] = token.split('.')
    const decoded = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
    decoded.exp = Math.floor(Date.now() / 1000) - 10 // already expired

    const reencodedPayload = Buffer.from(JSON.stringify(decoded))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Re-sign with the expired payload so only `exp` is being tested, not the signature check.
    const { createHmac } = await import('node:crypto')
    const signingInput = `${header}.${reencodedPayload}`
    const sig = createHmac('sha256', SECRET).update(signingInput).digest('base64url')
    const expiredToken = `${signingInput}.${sig}`

    expect(await verifySessionJwt(expiredToken, SECRET)).toBeNull()
  })

  it('rejects malformed tokens', async () => {
    expect(await verifySessionJwt('not.a.valid.jwt', SECRET)).toBeNull()
    expect(await verifySessionJwt('garbage', SECRET)).toBeNull()
  })
})
