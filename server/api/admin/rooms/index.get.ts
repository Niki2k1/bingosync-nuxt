import { defineEventHandler, getQuery } from 'nuxt/server'
import { count, desc, eq, ilike, or } from 'drizzle-orm'

const PAGE_SIZE = 25

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const { rooms, players } = schema
  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1)
  const q = String(query.q ?? '').trim()
  const where = q ? or(ilike(rooms.name, `%${q}%`), ilike(rooms.id, `${q}%`)) : undefined
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(rooms).where(where)
  const rows = await db.select().from(rooms).where(where).orderBy(desc(rooms.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
  const online = await onlineCounts(rows.map(r => r.id))
  const list = []
  for (const room of rows) {
    const game = room.currentGameId ? await db.query.games.findFirst({ where: { id: room.currentGameId } }) : undefined
    const [{ gameCount = 0 } = {}] = await db.select({ gameCount: count() }).from(schema.games).where(eq(schema.games.roomId, room.id))
    const creator = await db.query.players.findFirst({ where: { roomId: room.id }, orderBy: { createdAt: 'asc' } })
    void players
    list.push({
      id: room.id,
      name: room.name,
      creator: creator?.name ?? '',
      createdAt: room.createdAt.getTime(),
      active: (online.get(room.id) ?? 0) > 0,
      hideCard: room.hideCard,
      listed: room.listed,
      playerCount: room.playerCount,
      connected: online.get(room.id) ?? 0,
      games: gameCount,
      game: game ? gameInfo(game.variant) : null,
      seed: game?.seed ?? null
    })
  }
  return { rooms: list, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total }
})
