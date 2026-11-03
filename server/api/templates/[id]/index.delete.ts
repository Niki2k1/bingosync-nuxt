import { defineEventHandler, getRouterParam } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const { template } = await requireOwnTemplate(event, getRouterParam(event, 'id'))
  await deleteTemplate(template)
  return { ok: true }
})
