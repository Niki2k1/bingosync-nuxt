import { defineEventHandler, getRouterParam } from 'nuxt/server'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  await useDb().delete(schema.rooms).where(eq(schema.rooms.id, id))
  return { ok: true }
})
