import { defineEventHandler, getRouterParam } from 'nuxt/server'
import { eq } from 'drizzle-orm'
import * as v from 'valibot'

export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room } = await requireRoomPlayer(event, id)
  const { listed } = await readValidated(event, v.object({ listed: v.boolean() }))
  await useDb().update(schema.rooms).set({ listed }).where(eq(schema.rooms.id, room.id))
  return { listed }
})
