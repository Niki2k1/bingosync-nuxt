import { randomBytes, randomUUID } from 'node:crypto'

// Ids are random bytes as unpadded base64url: 22 chars (128 bit) for players, 43 chars (256 bit)
// for invite codes so a code glimpsed on a stream cannot realistically be typed or guessed.
export function newId(): string {
  const hex = randomUUID().replaceAll('-', '')
  return Buffer.from(hex, 'hex').toString('base64url')
}

export function newInviteCode(): string {
  return randomBytes(32).toString('base64url')
}

const ID_PATTERN = /^[A-Za-z0-9_-]{22,43}$/

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value)
}

export function requireIdParam(name: string, value: string | undefined): string {
  if (!isValidId(value)) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return value
}
