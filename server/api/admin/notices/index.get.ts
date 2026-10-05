import { defineEventHandler } from 'nuxt/server'
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDb().query.siteNotices.findMany({ orderBy: { id: 'asc' } })
})
