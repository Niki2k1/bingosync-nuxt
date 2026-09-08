import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'

export const relations = defineRelations(schema, r => ({
  rooms: {
    games: r.many.games(),
    players: r.many.players(),
    events: r.many.events()
  },
  games: {
    room: r.one.rooms({ from: r.games.roomId, to: r.rooms.id }),
    squares: r.many.squares()
  },
  squares: {
    game: r.one.games({ from: r.squares.gameId, to: r.games.id })
  },
  players: {
    room: r.one.rooms({ from: r.players.roomId, to: r.rooms.id }),
    events: r.many.events()
  },
  events: {
    room: r.one.rooms({ from: r.events.roomId, to: r.rooms.id }),
    player: r.one.players({ from: r.events.playerId, to: r.players.id })
  }
}))
