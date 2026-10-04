// PBKDF2 password hashing using the Workers-native Web Crypto API.
// No bcrypt/argon2 native bindings — those don't run in the Workers runtime.
// Iteration count is capped by Cloudflare's free-plan 10ms CPU-per-request limit:
// 100k iterations alone consumes ~10ms, leaving no budget for the rest of the
// request (D1 writes, JWT signing) and causes production 500s. 60k leaves margin.
const PBKDF2_ITERATIONS = 60_000
const SALT_BYTES = 16
const KEY_LENGTH_BITS = 256

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BITS,
  )
}

/** Returns a single string `pbkdf2$<iterations>$<saltB64>$<hashB64>` safe to store in the DB. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hashBits = await deriveBits(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(hashBits))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  // Use the iteration count embedded in the stored hash (not the current constant) so
  // changing PBKDF2_ITERATIONS in the future doesn't break verification for existing users.
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations <= 0) return false
  const salt = fromBase64(parts[2])
  const expected = parts[3]
  const hashBits = await deriveBits(password, salt, iterations)
  const actual = toBase64(new Uint8Array(hashBits))
  // Constant-time-ish comparison (lengths are fixed/known for PBKDF2-SHA256 output).
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}
