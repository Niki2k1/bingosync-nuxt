import { defineEventHandler, createError, getRouterParam } from 'nuxt/server'
import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { playerColorSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const player = await findPlayer(id)
  if (!player) throw createError({ statusCode: 404, statusMessage: 'Player not found' })
  const input = await readValidated(event, v.object({
    name: v.optional(v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(50))),
    color: v.optional(playerColorSchema),
    spectator: v.optional(v.boolean()),
    filterName: v.optional(v.boolean())
  }))
  const { filterName, ...values } = input
  const patch = { ...values, ...(filterName ? { name: await filterString(values.name ?? player.name) } : {}) }
  await useDb().update(schema.players).set(patch).where(eq(schema.players.id, id))
  return { ok: true }
})
