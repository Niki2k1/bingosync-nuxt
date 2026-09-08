import { eq } from 'drizzle-orm'
import { noticeSchema } from '../index.post'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number.parseInt(getRouterParam(event, 'id') ?? '', 10)
  const input = await readValidated(event, noticeSchema.partial())
  const [row] = await useDb().update(schema.siteNotices).set(input).where(eq(schema.siteNotices.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Notice not found' })
  return row
})
