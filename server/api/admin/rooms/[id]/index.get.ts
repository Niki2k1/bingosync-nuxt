export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const db = useDb()
  const room = await db.query.rooms.findFirst({
    where: { id },
    with: {
      games: { orderBy: { createdAt: 'desc' }, with: { squares: { orderBy: { slot: 'asc' } } } },
      players: { orderBy: { createdAt: 'asc' } }
    }
  })
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  const feed = await loadFeed(room, true, false)
  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt.getTime(),
    lastEventAt: room.lastEventAt.getTime(),
    active: room.active,
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
      connected: hubIsConnected(room.id, p.id)
    })),
    events: feed.events
  }
})
