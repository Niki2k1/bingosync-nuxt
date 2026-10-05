import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { schema, useDb } from './db'
import { recordAndPublish } from './events'
import type { Player } from '../db/schema'

const { players } = schema

// The room page sends a heartbeat every HEARTBEAT_MS while it is open. Missing two in a row
// (plus slack for a reload or a slow network) marks the player as gone.
export const HEARTBEAT_MS = 15_000
const OFFLINE_AFTER_MS = 40_000
// Heartbeats only write when the stored timestamp is this old, to keep the players shape quiet.
const TOUCH_AFTER_MS = 10_000

/**
 * Records that the player's room page is open. The first heartbeat after being offline
 * posts a "joined" event; offline players in the room are swept on the way.
 */
export async function heartbeat(player: Player) {
  const db = useDb()
  const now = new Date()
  if (!player.online) {
    const [came] = await db.update(players).set({ online: true, lastSeenAt: now })
      .where(and(eq(players.id, player.id), eq(players.online, false))).returning()
    if (came) await recordAndPublish({ id: player.roomId }, came, { type: 'connection', status: 'connected' })
  } else if (!player.lastSeenAt || now.getTime() - player.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    await db.update(players).set({ lastSeenAt: now }).where(eq(players.id, player.id))
  }
  await sweepPresence(player.roomId)
}

/** Marks a player as gone right away (leaving the room, closing the tab, admin kick). */
export async function goOffline(player: Pick<Player, 'id'>) {
  const [left] = await useDb().update(players).set({ online: false })
    .where(and(eq(players.id, player.id), eq(players.online, true))).returning()
  if (left) await recordAndPublish({ id: left.roomId }, left, { type: 'connection', status: 'disconnected' })
}

/**
 * Marks players without a recent heartbeat as offline and posts their "left" events.
 * There is no background job on wervt, so this runs lazily: on heartbeats and room listings.
 */
export async function sweepPresence(roomId?: string) {
  const cutoff = new Date(Date.now() - OFFLINE_AFTER_MS)
  const stale = and(
    eq(players.online, true),
    or(isNull(players.lastSeenAt), lt(players.lastSeenAt, cutoff)),
    roomId ? eq(players.roomId, roomId) : undefined
  )
  const gone = await useDb().update(players).set({ online: false }).where(stale).returning()
  for (const player of gone) await recordAndPublish({ id: player.roomId }, player, { type: 'connection', status: 'disconnected' })
}
