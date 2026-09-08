export function formatClock(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const UNITS: [string, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000]
]

/** Django-style "timesince": at most two adjacent units, e.g. "1 day, 3 hours". */
export function timeSince(timestamp: number, now = Date.now()): string {
  let remaining = Math.max(0, now - timestamp)
  const parts: string[] = []
  for (const [name, size] of UNITS) {
    const n = Math.floor(remaining / size)
    if (n > 0) {
      parts.push(`${n} ${name}${n === 1 ? '' : 's'}`)
      remaining -= n * size
      if (parts.length === 2) break
    } else if (parts.length === 1) {
      break
    }
  }
  return parts.length ? parts.join(', ') : '0 minutes'
}

export function extractApiError(error: unknown): { message: string, field?: string } {
  const e = error as { data?: { message?: string, statusMessage?: string, data?: { field?: string } }, message?: string }
  const message = e?.data?.message || e?.data?.statusMessage || e?.message || 'Something went wrong'
  return { message, field: e?.data?.data?.field }
}
