import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number.parseInt(getRouterParam(event, 'id') ?? '', 10)
  await useDb().delete(schema.siteNotices).where(eq(schema.siteNotices.id, id))
  return { ok: true }
})
