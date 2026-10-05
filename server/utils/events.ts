import { eq } from 'drizzle-orm'
import { schema, useDb } from './db'
import { playerColor } from './players'
import type { EventPayload, EventRow, Player, Room } from '../db/schema'

const { events, rooms } = schema

/**
 * Persists an event and bumps the room's activity timestamp. Players see it through the
 * room's events shape.
 */
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
  return row!
}
