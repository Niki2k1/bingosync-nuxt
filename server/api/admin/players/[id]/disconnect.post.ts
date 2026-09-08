export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const player = await findPlayer(id)
  if (!player) throw createError({ statusCode: 404, statusMessage: 'Player not found' })
  hubDisconnectPlayer(player.roomId, player.id)
  return { ok: true }
})
