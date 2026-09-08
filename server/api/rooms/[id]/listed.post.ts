import { eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room } = await requireRoomPlayer(event, id)
  const { listed } = await readValidated(event, z.object({ listed: z.boolean() }))
  await useDb().update(schema.rooms).set({ listed }).where(eq(schema.rooms.id, room.id))
  return { listed }
})
