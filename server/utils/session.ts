import type { H3Event } from 'h3'
import { schema, useDb } from './db'
import type { Player, Room } from '../db/schema'

export async function getSessionPlayerId(event: H3Event, roomId: string): Promise<string | undefined> {
  const session = await getUserSession(event)
  return session.rooms?.[roomId]
}

export async function rememberRoomPlayer(event: H3Event, roomId: string, playerId: string) {
  const session = await getUserSession(event)
  await setUserSession(event, { rooms: { ...(session.rooms ?? {}), [roomId]: playerId } })
}

export async function forgetRoomPlayer(event: H3Event, roomId: string) {
  const session = await getUserSession(event)
  const rooms = { ...(session.rooms ?? {}) }
  delete rooms[roomId]
  await replaceUserSession(event, { ...session, rooms })
}

/** Loads the room and the session's player for it, or throws 403 when the browser has not joined. */
export async function requireRoomPlayer(event: H3Event, roomId: string): Promise<{ room: Room, player: Player }> {
  const db = useDb()
  const room = await db.query.rooms.findFirst({ where: { id: roomId } })
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  const playerId = await getSessionPlayerId(event, roomId)
  const player = playerId ? await db.query.players.findFirst({ where: { id: playerId, roomId } }) : undefined
  if (!player) throw createError({ statusCode: 403, statusMessage: 'Join the room first' })
  return { room, player }
}

/** Resolves a player id the session owns to its room, or 404 (never reveals whether the id exists). */
export async function requireOwnedPlayer(event: H3Event, playerId: string): Promise<{ room: Room, player: Player }> {
  const db = useDb()
  const player = await db.query.players.findFirst({ where: { id: playerId } })
  const session = await getUserSession(event)
  if (!player || session.rooms?.[player.roomId] !== player.id) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const room = await db.query.rooms.findFirst({ where: { id: player.roomId } })
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return { room, player }
}

export async function requireAdmin(event: H3Event) {
  const session = await getUserSession(event)
  if (!session.user?.admin) throw createError({ statusCode: 401, statusMessage: 'Admin login required' })
}

export async function findPlayer(id: string): Promise<Player | undefined> {
  return useDb().query.players.findFirst({ where: { id } })
}

export async function findRoom(id: string): Promise<Room | undefined> {
  return useDb().query.rooms.findFirst({ where: { id } })
}

export async function findRoomByInvite(code: string): Promise<Room | undefined> {
  return useDb().query.rooms.findFirst({ where: { inviteCode: code } })
}

export async function requireRoom(id: string): Promise<Room> {
  const room = await findRoom(id)
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  return room
}

export { schema }
