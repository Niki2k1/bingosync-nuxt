import type { PlayView } from '#shared/types'

export default defineEventHandler(async (event): Promise<PlayView> => {
  const playerId = requireIdParam('playerId', getRouterParam(event, 'playerId'))
  const { room, player } = await requireOwnedPlayer(event, playerId)
  const game = await currentGame(room)
  const connectedIds = hubConnectedPlayerIds(room.id)
  const connected = connectedIds.length
    ? await useDb().query.players.findMany({ where: { id: { in: connectedIds }, spectator: false } })
    : []
  return {
    roomId: room.id,
    name: room.name,
    creator: await roomCreatorName(room.id),
    inviteCode: room.inviteCode,
    listed: room.listed,
    twitchOnly: room.twitchOnly,
    player: playerToJson(player),
    players: connected.map(playerToJson),
    settings: roomSettings(room, game),
    socketToken: issueSocketToken(room.id, player.id),
    overlayKey: player.overlayKey
  }
})
