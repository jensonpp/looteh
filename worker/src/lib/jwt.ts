// Minimal HS256 JWT implementation using Web Crypto (Workers-native, no `jsonwebtoken`).

export type JwtPayload = {
  sub: string // userId
  sid: string // session id (for revocation lookups)
  iat: number
  exp: number
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(input.length + ((4 - (input.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export async function signSessionJwt(
  payload: Pick<JwtPayload, 'sub' | 'sid'>,
  secret: string,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const iat = Math.floor(Date.now() / 1000)
  const fullPayload: JwtPayload = { ...payload, iat, exp: iat + SESSION_TTL_SECONDS }

  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(fullPayload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const key = await hmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))

  return `${signingInput}.${base64url(signature)}`
}

export async function verifySessionJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const key = await hmacKey(secret)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64urlDecode(encodedSignature),
    new TextEncoder().encode(signingInput),
  )
  if (!valid) return null

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(encodedPayload))) as JwtPayload
    if (payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
