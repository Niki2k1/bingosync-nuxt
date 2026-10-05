import { defineEventHandler, getQuery, getRouterParam } from 'nuxt/server'
import type { OverlayView } from '#shared/types'

// The overlay runs inside OBS without cookies, so the player's overlay key is the credential.
export default defineEventHandler(async (event): Promise<OverlayView> => {
  const playerId = requireIdParam('playerId', getRouterParam(event, 'playerId'))
  const { room, player } = await requireOverlayPlayer(playerId, String(getQuery(event).key ?? ''))
  const game = await currentGame(room)
  return {
    roomId: room.id,
    name: room.name,
    player: playerToJson(player),
    settings: { ...roomSettings(room, game), seed: game.seed }
  }
})
