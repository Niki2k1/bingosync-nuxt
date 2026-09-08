import type { InviteView } from '../../../../shared/types'

export default defineEventHandler(async (event): Promise<InviteView> => {
  const code = requireIdParam('code', getRouterParam(event, 'code'))
  const room = await findRoomByInvite(code)
  if (!room) throw createError({ statusCode: 404, statusMessage: 'This invite link is not valid anymore' })
  const game = await currentGame(room)
  const playerId = await getSessionPlayerId(event, room.id)
  const player = playerId ? await findPlayer(playerId) : undefined
  return {
    name: room.name,
    creator: await roomCreatorName(room.id),
    game: gameInfo(game.variant),
    twitchOnly: room.twitchOnly,
    playerId: player && player.roomId === room.id ? player.id : null
  }
})
