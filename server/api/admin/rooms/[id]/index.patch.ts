import { defineEventHandler, getRouterParam } from 'nuxt/server'
import { eq } from 'drizzle-orm'
import * as v from 'valibot'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  await requireRoom(id)
  const input = await readValidated(event, v.object({
    name: v.optional(v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(255))),
    hideCard: v.optional(v.boolean()),
    listed: v.optional(v.boolean()),
    twitchOnly: v.optional(v.boolean())
  }))
  await useDb().update(schema.rooms).set(input).where(eq(schema.rooms.id, id))
  return { ok: true }
})
