import { defineEventHandler } from 'nuxt/server'
import { templateSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  rateLimit(event, 'template-write', 30, 60_000)
  const input = await readValidated(event, templateSchema)
  return templateToJson(await createTemplate(user, input), user)
})
