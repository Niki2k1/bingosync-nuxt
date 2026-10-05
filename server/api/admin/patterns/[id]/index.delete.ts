import { defineEventHandler, getRouterParam } from 'nuxt/server'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number.parseInt(getRouterParam(event, 'id') ?? '', 10)
  await useDb().delete(schema.filteredPatterns).where(eq(schema.filteredPatterns.id, id))
  return { ok: true }
})
