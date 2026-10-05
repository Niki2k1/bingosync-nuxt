import { defineEventHandler, getRouterParam } from 'nuxt/server'
import { eq } from 'drizzle-orm'

// Re-applies the blacklist to the room name and every player name in the room.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const room = await requireRoom(id)
  const db = useDb()
  await db.update(schema.rooms).set({ name: await filterString(room.name) }).where(eq(schema.rooms.id, id))
  const roomPlayers = await db.query.players.findMany({ where: { roomId: id } })
  for (const player of roomPlayers) {
    await db.update(schema.players).set({ name: await filterString(player.name) }).where(eq(schema.players.id, player.id))
  }
  return { ok: true }
})
