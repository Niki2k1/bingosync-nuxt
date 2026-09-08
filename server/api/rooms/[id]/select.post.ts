import { selectGoalSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room, player } = await requireRoomPlayer(event, id)
  if (player.spectator) throw createError({ statusCode: 403, statusMessage: 'Spectators cannot mark goals' })
  const input = await readValidated(event, selectGoalSchema)
  try {
    await selectGoal(room, player, input.slot, input.color, input.remove)
  } catch (error) {
    if (error instanceof LockoutError) badRequest(error.message)
    throw error
  }
  return { ok: true }
})
