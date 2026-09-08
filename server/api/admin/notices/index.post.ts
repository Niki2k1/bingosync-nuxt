import { z } from 'zod'

export const noticeSchema = z.object({
  type: z.enum(['notice', 'announcement', 'warning', 'error']).default('notice'),
  header: z.string().default(''),
  body: z.string().default(''),
  visibleToUsers: z.boolean().default(false),
  visibleToAdmins: z.boolean().default(false)
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = await readValidated(event, noticeSchema)
  const [row] = await useDb().insert(schema.siteNotices).values(input).returning()
  return row
})
