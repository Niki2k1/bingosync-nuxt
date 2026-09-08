import { count, eq, gte } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const { rooms, players, games, events } = schema
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0
  const [totalRooms, activeRooms, totalPlayers, totalGames, totalEvents, roomsToday, eventsToday] = await Promise.all([
    one(db.select({ n: count() }).from(rooms)),
    one(db.select({ n: count() }).from(rooms).where(eq(rooms.active, true))),
    one(db.select({ n: count() }).from(players)),
    one(db.select({ n: count() }).from(games)),
    one(db.select({ n: count() }).from(events)),
    one(db.select({ n: count() }).from(rooms).where(gte(rooms.createdAt, dayAgo))),
    one(db.select({ n: count() }).from(events).where(gte(events.createdAt, dayAgo)))
  ])
  const connectedPlayers = hubActiveRoomIds().reduce((sum, id) => sum + hubConnectedPlayerIds(id).length, 0)
  return { totalRooms, activeRooms, connectedPlayers, totalPlayers, totalGames, totalEvents, roomsToday, eventsToday }
})
