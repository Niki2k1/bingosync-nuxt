import { createError, getRequestIP, type RequestEvent } from 'nuxt/server'

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

// Cheap in-memory sliding window; Cloudflare in front handles anything serious.
export function rateLimit(event: RequestEvent, scope: string, limit: number, windowMs: number) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = `${scope}:${ip}`
  const now = Date.now()
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter(t => now - t < windowMs)
  if (bucket.hits.length >= limit) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests', message: 'Slow down a little and try again in a minute.' })
  }
  bucket.hits.push(now)
  buckets.set(key, bucket)
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.hits.every(t => now - t >= windowMs)) buckets.delete(k)
  }
}
