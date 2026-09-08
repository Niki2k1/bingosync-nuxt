import type { OverlayView } from '../../../../shared/types'

// The overlay runs inside OBS without cookies, so the player's overlay key is the credential.
export default defineEventHandler(async (event): Promise<OverlayView> => {
  const playerId = requireIdParam('playerId', getRouterParam(event, 'playerId'))
  const key = String(getQuery(event).key ?? '')
  const player = await findPlayer(playerId)
  if (!player || !key || player.overlayKey !== key) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const room = await requireRoom(player.roomId)
  const game = await currentGame(room)
  const connectedIds = hubConnectedPlayerIds(room.id)
  const connected = connectedIds.length
    ? await useDb().query.players.findMany({ where: { id: { in: connectedIds }, spectator: false } })
    : []
  return {
    roomId: room.id,
    name: room.name,
    player: playerToJson(player),
    players: connected.map(playerToJson),
    settings: { ...roomSettings(room, game), seed: game.seed },
    board: await loadBoard(game),
    socketToken: issueSocketToken(room.id, player.id, true)
  }
})
