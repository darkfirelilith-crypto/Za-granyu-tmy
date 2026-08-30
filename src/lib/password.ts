import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  // Defensive: corrupted/legacy/malformed password rows must not crash login.
  // Any parse/scrypt failure is treated as "wrong password" (return false).
  try {
    const parts = stored.split(':')
    if (parts.length !== 2) return false
    const [salt, hash] = parts
    if (!salt || !hash) return false
    const hashBuf = Buffer.from(hash, 'hex')
    const testBuf = scryptSync(password, salt, 64)
    // timingSafeEqual requires equal lengths; unequal length = not equal
    return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf)
  } catch {
    return false
  }
}
