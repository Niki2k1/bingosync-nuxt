import { defineEventHandler, createError, getRouterParam } from 'nuxt/server'
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const player = await findPlayer(id)
  if (!player) throw createError({ statusCode: 404, statusMessage: 'Player not found' })
  // Marks them offline; an open room page comes back online with its next heartbeat.
  await goOffline(player)
  return { ok: true }
})
