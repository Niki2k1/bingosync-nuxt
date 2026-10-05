import { defineEventHandler } from 'nuxt/server'
import * as v from 'valibot'

export const noticeSchema = v.object({
  type: v.optional(v.picklist(['notice', 'announcement', 'warning', 'error']), 'notice'),
  header: v.optional(v.string(), ''),
  body: v.optional(v.string(), ''),
  visibleToUsers: v.optional(v.boolean(), false),
  visibleToAdmins: v.optional(v.boolean(), false)
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = await readValidated(event, noticeSchema)
  const [row] = await useDb().insert(schema.siteNotices).values(input).returning()
  return row
})
