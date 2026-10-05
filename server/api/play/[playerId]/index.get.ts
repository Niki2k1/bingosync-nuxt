import { defineEventHandler, getRouterParam } from 'nuxt/server'
import type { PlayView } from '#shared/types'

export default defineEventHandler(async (event): Promise<PlayView> => {
  const playerId = requireIdParam('playerId', getRouterParam(event, 'playerId'))
  const { room, player } = await requireOwnedPlayer(event, playerId)
  const game = await currentGame(room)
  return {
    roomId: room.id,
    name: room.name,
    creator: await roomCreatorName(room.id),
    inviteCode: room.inviteCode,
    listed: room.listed,
    twitchOnly: room.twitchOnly,
    player: playerToJson(player),
    settings: roomSettings(room, game),
    overlayKey: player.overlayKey
  }
})
