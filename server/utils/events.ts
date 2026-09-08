import { and, count, desc, eq } from 'drizzle-orm'
import { schema, useDb } from './db'
import { hubBroadcast } from './hub'
import { playerColor, playerToJson } from './players'
import type { EventPayload, EventRow, Player, Room } from '../db/schema'
import type { FeedEvent } from '#shared/types'
import { getVariant } from '#shared/utils/games'

const { events, rooms } = schema

/** Persists an event, bumps the room's activity timestamp and pushes it to every socket in the room. */
export async function recordAndPublish(room: Pick<Room, 'id'>, player: Player, payload: EventPayload): Promise<EventRow> {
  const db = useDb()
  const now = new Date()
  const [row] = await db.insert(events).values({
    roomId: room.id,
    playerId: player.id,
    type: payload.type,
    playerColor: playerColor(player),
    createdAt: now,
    payload
  }).returning()
  await db.update(rooms).set({ lastEventAt: now }).where(eq(rooms.id, room.id))

  const json = await eventToJson(row!, player, { currentGameSeedHidden: false })
  hubBroadcast(room.id, { type: 'event', event: json })
  return row!
}

interface FeedContext {
  /** id of the newest new-card event in the room; that card is "current" */
  latestNewCardId?: number
  /** whether the seed of the current card must be withheld */
  currentGameSeedHidden: boolean
}

export async function eventToJson(row: EventRow, player: Player, ctx: FeedContext): Promise<FeedEvent> {
  const base = {
    id: row.id,
    timestamp: row.createdAt.getTime(),
    player: playerToJson(player),
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
      const hideSeed = isCurrent && ctx.currentGameSeedHidden
      return {
        ...base,
        type: 'new-card',
        game: getVariant(p.variant)?.name ?? `Unknown game ${p.variant}`,
        seed: hideSeed ? null : p.seed,
        showSeed: getVariant(p.variant)?.usesSeed ?? true,
        hideCard: p.hideCard,
        isCurrent
      }
    }
  }
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000

export async function loadFeed(room: Room, full: boolean, currentGameSeedHidden: boolean) {
  const db = useDb()
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(events).where(eq(events.roomId, room.id))
  const rows = await db.query.events.findMany({
    where: full ? { roomId: room.id } : { roomId: room.id, createdAt: { gte: new Date(Date.now() - RECENT_WINDOW_MS) } },
    with: { player: true },
    orderBy: { createdAt: 'asc', id: 'asc' }
  })
  const latest = await db.select({ id: events.id }).from(events)
    .where(and(eq(events.roomId, room.id), eq(events.type, 'new-card')))
    .orderBy(desc(events.createdAt), desc(events.id)).limit(1)
  const ctx: FeedContext = { latestNewCardId: latest[0]?.id, currentGameSeedHidden }
  const list: FeedEvent[] = []
  for (const row of rows) if (row.player) list.push(await eventToJson(row, row.player, ctx))
  return { events: list, allIncluded: total === rows.length }
}
