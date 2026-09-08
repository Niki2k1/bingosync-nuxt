import { colorSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room, player } = await requireRoomPlayer(event, id)
  if (player.spectator) throw createError({ statusCode: 403, statusMessage: 'Spectators have no color' })
  const input = await readValidated(event, colorSchema)
  await changeColor(room, player, input.color)
  return { ok: true }
})
