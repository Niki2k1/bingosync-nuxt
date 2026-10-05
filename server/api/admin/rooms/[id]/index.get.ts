import { defineEventHandler, createError, getRouterParam } from 'nuxt/server'
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const db = useDb()
  const room = await db.query.rooms.findFirst({
    where: { id },
    with: {
      games: { orderBy: { createdAt: 'desc' }, with: { squares: { orderBy: { slot: 'asc' } } } },
      players: { orderBy: { createdAt: 'asc' } },
      events: { orderBy: { createdAt: 'asc', id: 'asc' } }
    }
  })
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  const playersById = new Map(room.players.map(p => [p.id, playerToJson(p)]))
  const latestNewCardId = room.events.findLast(e => e.type === 'new-card')?.id
  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt.getTime(),
    lastEventAt: room.lastEventAt.getTime(),
    active: room.players.some(p => p.online),
    hideCard: room.hideCard,
    listed: room.listed,
    twitchOnly: room.twitchOnly,
    inviteCode: room.inviteCode,
    playerCount: room.playerCount,
    currentGameId: room.currentGameId,
    games: room.games.map(g => ({
      id: g.id,
      seed: g.seed,
      lockout: g.lockout,
      createdAt: g.createdAt.getTime(),
      revealedAt: g.revealedAt?.getTime() ?? null,
      game: gameInfo(g.variant),
      squares: g.squares.map(squareToJson)
    })),
    players: room.players.map(p => ({
      ...playerToJson(p),
      rawColor: p.color,
      twitchLogin: p.twitchLogin,
      createdAt: p.createdAt.getTime(),
      connected: p.online
    })),
    events: room.events.flatMap((e) => {
      const player = playersById.get(e.playerId)
      return player ? [toFeedEvent(e, player, { latestNewCardId })] : []
    })
  }
})
