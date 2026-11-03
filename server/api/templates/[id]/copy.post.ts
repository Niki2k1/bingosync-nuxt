import { defineEventHandler, getRouterParam } from 'nuxt/server'

// Someone else's shared board becomes the visitor's own, so they can change it without touching the original.
export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  rateLimit(event, 'template-write', 30, 60_000)
  const source = await requireTemplate(getRouterParam(event, 'id'))
  const copy = await createTemplate(user, { name: source.name, mode: source.mode, goals: source.goals })
  return templateToJson(copy, user)
})
