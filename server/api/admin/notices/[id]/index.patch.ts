import { defineEventHandler, createError, getRouterParam } from 'nuxt/server'
import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { noticeSchema } from '../index.post'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number.parseInt(getRouterParam(event, 'id') ?? '', 10)
  const input = await readValidated(event, v.partial(noticeSchema))
  const [row] = await useDb().update(schema.siteNotices).set(input).where(eq(schema.siteNotices.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Notice not found' })
  return row
})
