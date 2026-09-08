import type { Player } from '../db/schema'
import type { PlayerJson } from '#shared/types'

export function playerToJson(player: Player): PlayerJson {
  return {
    id: player.id,
    name: player.name,
    color: player.spectator ? 'blank' : player.color,
    spectator: player.spectator
  }
}

export function playerColor(player: Player) {
  return player.spectator ? 'blank' : player.color
}
