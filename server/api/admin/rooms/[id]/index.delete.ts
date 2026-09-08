import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  for (const playerId of hubConnectedPlayerIds(id)) hubDisconnectPlayer(id, playerId)
  await useDb().delete(schema.rooms).where(eq(schema.rooms.id, id))
  return { ok: true }
})
