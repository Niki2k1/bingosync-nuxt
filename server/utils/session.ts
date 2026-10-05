import { createError, useRuntimeConfig, useSession, type RequestEvent } from 'nuxt/server'
import { useWervtUser } from '@wervt/nuxt/server'
import { schema, useDb } from './db'
import type { Player, Room } from '../db/schema'

interface SessionData extends Record<string, unknown> {
  // roomId -> playerId for every room this browser has joined, signed in or not
  rooms?: Record<string, string>
}

// Sealed with a key derived from Nuxt's appSecret (wervt sets NUXT_APP_SECRET per app).
const useBrowserSession = (event: RequestEvent) =>
  useSession<SessionData>(event, { name: 'bingosync', maxAge: 60 * 60 * 24 * 365 })

export async function getSessionPlayerId(event: RequestEvent, roomId: string): Promise<string | undefined> {
  const session = await useBrowserSession(event)
  return session.data.rooms?.[roomId]
}

/** Every room this browser has joined, roomId -> playerId. */
export async function getSessionRooms(event: RequestEvent): Promise<Record<string, string>> {
  return (await useBrowserSession(event)).data.rooms ?? {}
}

export async function rememberRoomPlayer(event: RequestEvent, roomId: string, playerId: string) {
  const session = await useBrowserSession(event)
  await session.update({ rooms: { ...(session.data.rooms ?? {}), [roomId]: playerId } })
}

export async function forgetRoomPlayer(event: RequestEvent, roomId: string) {
  const session = await useBrowserSession(event)
  const rooms = { ...(session.data.rooms ?? {}) }
  delete rooms[roomId]
  await session.update({ rooms })
}

export interface TwitchIdentity {
  id: string
  login: string
}

/** The wervt user's Twitch account, when they signed in with (or linked) Twitch. */
export function getTwitch(event: RequestEvent): TwitchIdentity | undefined {
  const user = useWervtUser(event)
  const id = user?.accounts?.twitch
  if (!user || !id) return undefined
  return { id, login: (user.name ?? id).toLowerCase() }
}

export function isAdmin(event: RequestEvent): boolean {
  const email = useWervtUser(event)?.email.toLowerCase()
  const admins = useRuntimeConfig().adminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return Boolean(email && admins.includes(email))
}

/** Loads the room and the session's player for it, or throws 403 when the browser has not joined. */
export async function requireRoomPlayer(event: RequestEvent, roomId: string): Promise<{ room: Room, player: Player }> {
  const db = useDb()
  const room = await db.query.rooms.findFirst({ where: { id: roomId } })
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  const playerId = await getSessionPlayerId(event, roomId)
  const player = playerId ? await db.query.players.findFirst({ where: { id: playerId, roomId } }) : undefined
  if (!player) throw createError({ statusCode: 403, statusMessage: 'Join the room first' })
  return { room, player }
}

/** Resolves a player id the session owns to its room, or 404 (never reveals whether the id exists). */
export async function requireOwnedPlayer(event: RequestEvent, playerId: string): Promise<{ room: Room, player: Player }> {
  const db = useDb()
  const player = await db.query.players.findFirst({ where: { id: playerId } })
  if (!player || (await getSessionPlayerId(event, player.roomId)) !== player.id) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const room = await db.query.rooms.findFirst({ where: { id: player.roomId } })
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return { room, player }
}

/** The overlay's player, checked against its overlay key; 404 otherwise. */
export async function requireOverlayPlayer(playerId: string, key: string): Promise<{ room: Room, player: Player }> {
  const player = await findPlayer(playerId)
  if (!player || !key || player.overlayKey !== key) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return { room: await requireRoom(player.roomId), player }
}

export function requireAdmin(event: RequestEvent) {
  if (!isAdmin(event)) throw createError({ statusCode: 401, statusMessage: 'Admin login required' })
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

