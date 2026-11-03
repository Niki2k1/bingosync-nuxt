import { defineEventHandler, getRouterParam } from 'nuxt/server'
import { templateSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  const { template, user } = await requireOwnTemplate(event, getRouterParam(event, 'id'))
  rateLimit(event, 'template-write', 30, 60_000)
  const input = await readValidated(event, templateSchema)
  return templateToJson(await updateTemplate(template, user, input), user)
})
