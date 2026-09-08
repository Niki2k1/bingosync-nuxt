import { eq } from 'drizzle-orm'

const HEARTBEAT_MS = 30_000

export default defineNitroPlugin(() => {
  const db = useDb()
  // No socket survives a restart, so every room starts out inactive.
  db.update(schema.rooms).set({ active: false }).where(eq(schema.rooms.active, true)).then(() => {}, console.error)

  const timer = setInterval(() => {
    hubBroadcastAll({ type: 'ping' })
    purgeExpiredTokens()
  }, HEARTBEAT_MS)
  timer.unref()
})
