import { defineEventHandler, createError, getQuery, getRouterParam } from 'nuxt/server'
import { proxyShape, type ShapeOptions } from '@wervt/nuxt/server'

// Live room data through Electric. Players need the room in their session; the OBS overlay
// passes `?overlay=<playerId>&key=<overlayKey>` and only gets what it draws.
const SHAPES: Record<string, { overlay: boolean, shape: (roomId: string, overlay: boolean) => ShapeOptions }> = {
  room: {
    overlay: true,
    shape: (id, overlay) => ({
      table: 'rooms',
      where: '"id" = $1',
      params: [id],
      columns: ['id', 'name', 'listed', 'twitchOnly', 'hideCard', 'currentGameId', ...(overlay ? [] : ['inviteCode'])]
    })
  },
  // Without the seed: hidden cards keep it secret, /settings hands it out once revealed.
  games: {
    overlay: true,
    shape: id => ({ table: 'games', where: '"roomId" = $1', params: [id], columns: ['id', 'roomId', 'variant', 'lockout', 'createdAt', 'revealedAt'] })
  },
  squares: {
    overlay: true,
    shape: id => ({ table: 'squares', where: '"roomId" = $1', params: [id] })
  },
  players: {
    overlay: true,
    shape: id => ({ table: 'players', where: '"roomId" = $1', params: [id], columns: ['id', 'roomId', 'name', 'color', 'spectator', 'online', 'createdAt'] })
  },
  events: {
    overlay: false,
    shape: id => ({ table: 'events', where: '"roomId" = $1', params: [id] })
  }
}

export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const config = SHAPES[getRouterParam(event, 'table') ?? '']
  if (!config) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const query = getQuery(event)
  const overlay = typeof query.overlay === 'string'
  if (overlay) {
    const { room } = await requireOverlayPlayer(query.overlay as string, String(query.key ?? ''))
    if (room.id !== id || !config.overlay) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  } else {
    await requireRoomPlayer(event, id)
  }
  return proxyShape(event, config.shape(id, overlay))
})
