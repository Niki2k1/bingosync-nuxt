import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { playerColorSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const player = await findPlayer(id)
  if (!player) throw createError({ statusCode: 404, statusMessage: 'Player not found' })
  const input = await readValidated(event, z.object({
    name: z.string().trim().min(1).max(50).optional(),
    color: playerColorSchema.optional(),
    spectator: z.boolean().optional(),
    filterName: z.boolean().optional()
  }))
  const { filterName, ...values } = input
  const patch = { ...values, ...(filterName ? { name: await filterString(values.name ?? player.name) } : {}) }
  await useDb().update(schema.players).set(patch).where(eq(schema.players.id, id))
  return { ok: true }
})
