import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  return (await listTemplates(user.id)).map(templateSummary)
})
