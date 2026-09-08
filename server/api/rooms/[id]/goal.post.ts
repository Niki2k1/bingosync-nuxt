import { editGoalSchema } from '../../../../shared/utils/schemas'

export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room, player } = await requireRoomPlayer(event, id)
  if (player.spectator) throw createError({ statusCode: 403, statusMessage: 'Spectators cannot edit goals' })
  const input = await readValidated(event, editGoalSchema)
  await editGoal(room, player, input.slot, input.name)
  return { ok: true }
})
