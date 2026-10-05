import type { Player } from '../db/schema'

export function playerColor(player: Player) {
  return player.spectator ? 'blank' : player.color
}
