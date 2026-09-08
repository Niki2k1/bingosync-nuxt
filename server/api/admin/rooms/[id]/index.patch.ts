import { eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  await requireRoom(id)
  const input = await readValidated(event, z.object({
    name: z.string().trim().min(1).max(255).optional(),
    hideCard: z.boolean().optional(),
    listed: z.boolean().optional(),
    twitchOnly: z.boolean().optional(),
    active: z.boolean().optional()
  }))
  await useDb().update(schema.rooms).set(input).where(eq(schema.rooms.id, id))
  return { ok: true }
})
