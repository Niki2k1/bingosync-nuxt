import type { EventPayload, FeedEvent, PlayerJson } from '../types'
import type { PlayerColor, SquareColor } from './colors'
import { getVariant } from './games'

/** Milliseconds from a Date, or from Postgres timestamp text as Electric sends it. */
export function toMillis(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  // "2026-10-06 01:02:03.123+00" -> ISO 8601
  return Date.parse(value.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'))
}

export function playerToJson(player: { id: string, name: string, color: PlayerColor, spectator: boolean }): PlayerJson {
  return {
    id: player.id,
    name: player.name,
    color: player.spectator ? 'blank' : player.color,
    spectator: player.spectator
  }
}

export interface FeedRow {
  id: number
  createdAt: Date | string
  playerColor: SquareColor
  payload: EventPayload
}

export interface FeedContext {
  /** id of the newest new-card event in the room; that card is "current" */
  latestNewCardId?: number
  /** seed of the current card when this viewer may see it */
  currentSeed?: number | null
}

export function toFeedEvent(row: FeedRow, player: PlayerJson, ctx: FeedContext = {}): FeedEvent {
  const base = {
    id: row.id,
    timestamp: toMillis(row.createdAt),
    player,
    playerColor: row.playerColor
  }
  const p = row.payload
  switch (p.type) {
    case 'chat':
      return { ...base, type: 'chat', text: p.text }
    case 'goal':
      return { ...base, type: 'goal', square: { slot: p.slot, name: p.goal, colors: p.colors }, color: p.color, remove: p.remove }
    case 'color':
      return { ...base, type: 'color', color: p.color, moved: p.moved ?? 0 }
    case 'revealed':
      return { ...base, type: 'revealed' }
    case 'connection':
      return { ...base, type: 'connection', status: p.status }
    case 'edit':
      return { ...base, type: 'edit', slot: p.slot, name: p.name }
    case 'new-card': {
      const isCurrent = ctx.latestNewCardId === undefined || ctx.latestNewCardId === row.id
      return {
        ...base,
        type: 'new-card',
        game: getVariant(p.variant)?.name ?? `Unknown game ${p.variant}`,
        seed: p.seed ?? (isCurrent ? ctx.currentSeed ?? null : null),
        showSeed: getVariant(p.variant)?.usesSeed ?? true,
        hideCard: p.hideCard,
        isCurrent
      }
    }
  }
}
