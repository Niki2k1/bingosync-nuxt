import { and, count, desc, eq, like } from 'drizzle-orm'

const PAGE_SIZE = 50

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const { events, players, rooms } = schema
  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1)
  const type = String(query.type ?? '')
  const roomId = String(query.roomId ?? '')
  const q = String(query.q ?? '').trim()
  const conditions = [
    type ? eq(events.type, type as typeof events.$inferSelect.type) : undefined,
    roomId ? eq(events.roomId, roomId) : undefined,
    q ? like(events.payload, `%${q}%`) : undefined
  ].filter((c): c is NonNullable<typeof c> => c !== undefined)
  const where = conditions.length ? and(...conditions) : undefined
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(events).where(where)
  const rows = await db.select({ event: events, player: players, room: rooms }).from(events)
    .innerJoin(players, eq(events.playerId, players.id))
    .innerJoin(rooms, eq(events.roomId, rooms.id))
    .where(where)
    .orderBy(desc(events.createdAt), desc(events.id))
    .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
  const list = []
  for (const row of rows) {
    const json = await eventToJson(row.event, row.player, { currentGameSeedHidden: false })
    list.push({ ...json, room: { id: row.room.id, name: row.room.name } })
  }
  return { events: list, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total }
})
