import { and, asc, desc, eq, gt, count, inArray } from 'drizzle-orm'
import { schema, useDb } from './db'
import { generateCard, randomSeed } from './generator'
import { filterString } from './filter'
import { hubBroadcast, hubConnectedPlayerIds } from './hub'
import { newId, newInviteCode } from './ids'
import { recordAndPublish } from './events'
import { PLAYER_COLORS, colorsToMask, maskToColors, type PlayerColor } from '#shared/utils/colors'
import { getGroup, requireVariant } from '#shared/utils/games'
import type { Game, Player, Room, Square } from '../db/schema'
import type { GameInfo, HistoryEntry, RoomListEntry, RoomSettings, SquareJson } from '#shared/types'

const { rooms, games, squares, players } = schema

const STALE_THRESHOLD_MS = 90 * 60 * 1000

export function gameInfo(variantId: number): GameInfo {
  const variant = requireVariant(variantId)
  const group = getGroup(variant.group)
  return {
    variant: variant.id,
    group: variant.group,
    name: variant.name,
    groupName: group?.name ?? variant.name,
    variantName: variant.variantName,
    shortName: variant.shortName
  }
}

export function squareToJson(square: Square): SquareJson {
  return { slot: square.slot, name: square.goal, colors: maskToColors(square.colorMask) }
}

export async function currentGame(room: Room): Promise<Game> {
  const db = useDb()
  const game = room.currentGameId
    ? await db.query.games.findFirst({ where: { id: room.currentGameId } })
    : await db.query.games.findFirst({ where: { roomId: room.id }, orderBy: { createdAt: 'desc', id: 'desc' } })
  if (!game) throw createError({ statusCode: 500, statusMessage: 'Room has no game' })
  return game
}

export async function loadBoard(game: Game): Promise<SquareJson[]> {
  const rows = await useDb().query.squares.findMany({ where: { gameId: game.id }, orderBy: { slot: 'asc' } })
  return rows.map(squareToJson)
}

export function isSeedHidden(room: Room, game: Game): boolean {
  return room.hideCard && !game.revealedAt
}

export function roomSettings(room: Room, game: Game): RoomSettings {
  return {
    hideCard: room.hideCard,
    lockout: game.lockout,
    seed: isSeedHidden(room, game) ? null : game.seed,
    game: gameInfo(game.variant)
  }
}

interface NewGameInput {
  variant: number
  seed?: number
  lockout: boolean
  customBoard?: unknown[]
}

/** Generates a card and stores it as a new game for the room; returns the saved game. */
async function insertGame(roomId: string, input: NewGameInput): Promise<Game> {
  const variant = requireVariant(input.variant)
  const seed = input.seed ?? (variant.usesSeed ? randomSeed() : 0)
  const card = generateCard(input.variant, seed, input.customBoard)
  const db = useDb()
  return db.transaction((tx) => {
    const game = tx.insert(games).values({ roomId, seed, variant: input.variant, lockout: input.lockout }).returning().get()
    tx.insert(squares).values(card.map((square, i) => ({ gameId: game.id, slot: i + 1, goal: square.name }))).run()
    tx.update(rooms).set({ currentGameId: game.id }).where(eq(rooms.id, roomId)).run()
    return game
  })
}

export interface TwitchIdentity {
  id: string
  login: string
}

export interface CreateRoomInput extends NewGameInput {
  name: string
  nickname: string
  spectator: boolean
  hideCard: boolean
  listed: boolean
  twitchOnly: boolean
  twitch?: TwitchIdentity
}

export async function createRoom(input: CreateRoomInput): Promise<{ room: Room, creator: Player }> {
  const db = useDb()
  const roomId = newId()
  const name = await filterString(input.name)
  const [room] = await db.insert(rooms).values({
    id: roomId,
    name,
    inviteCode: newInviteCode(),
    listed: input.listed,
    twitchOnly: input.twitchOnly,
    hideCard: input.hideCard,
    playerCount: 1
  }).returning()
  try {
    await insertGame(roomId, input)
  } catch (error) {
    await db.delete(rooms).where(eq(rooms.id, roomId))
    throw error
  }
  const creator = await joinRoom(room!, input.nickname, input.spectator, input.twitch)
  return { room: (await db.query.rooms.findFirst({ where: { id: roomId } }))!, creator }
}

/** First color nobody in the room plays with yet; once all ten are taken, the least used one. */
async function nextFreeColor(roomId: string): Promise<PlayerColor> {
  const used = await useDb().query.players.findMany({ where: { roomId, spectator: false }, columns: { color: true } })
  const counts = new Map<PlayerColor, number>(PLAYER_COLORS.map(c => [c, 0]))
  for (const { color } of used) counts.set(color, (counts.get(color) ?? 0) + 1)
  return [...PLAYER_COLORS].sort((a, b) => counts.get(a)! - counts.get(b)!)[0]!
}

export async function joinRoom(room: Room, nickname: string, spectator: boolean, twitch?: TwitchIdentity): Promise<Player> {
  const db = useDb()
  const [player] = await db.insert(players).values({
    id: newId(),
    roomId: room.id,
    name: await filterString(nickname),
    color: await nextFreeColor(room.id),
    spectator,
    overlayKey: newId(),
    twitchId: twitch?.id ?? null,
    twitchLogin: twitch?.login ?? null
  }).returning()
  await refreshRoomCounters(room.id)
  return player!
}

export async function rotateInvite(room: Room): Promise<string> {
  const inviteCode = newInviteCode()
  await useDb().update(rooms).set({ inviteCode }).where(eq(rooms.id, room.id))
  return inviteCode
}

export async function newCard(room: Room, player: Player, input: NewGameInput & { hideCard: boolean }): Promise<Game> {
  const db = useDb()
  const game = await insertGame(room.id, input)
  await db.update(rooms).set({ hideCard: input.hideCard }).where(eq(rooms.id, room.id))
  await recordAndPublish(room, player, { type: 'new-card', variant: input.variant, seed: game.seed, hideCard: input.hideCard })
  return game
}

export class LockoutError extends Error {}

/** Applies a color change to a square, enforcing lockout rules, and publishes the goal event. */
export async function selectGoal(room: Room, player: Player, slot: number, color: PlayerColor, remove: boolean) {
  const db = useDb()
  const game = await currentGame(room)
  const square = await db.query.squares.findFirst({ where: { gameId: game.id, slot } })
  if (!square) throw createError({ statusCode: 400, statusMessage: 'Invalid slot' })

  const colors = new Set(maskToColors(square.colorMask))
  if (game.lockout) {
    if (!remove && colors.size > 0) throw new LockoutError('Blocked by Lockout')
    if (remove && !(colors.size === 1 && colors.has(color))) throw new LockoutError('Blocked by Lockout')
  }
  if (remove) colors.delete(color)
  else colors.add(color)

  const colorMask = colorsToMask(colors)
  await db.update(squares).set({ colorMask }).where(eq(squares.id, square.id))
  await recordAndPublish(room, player, {
    type: 'goal',
    slot,
    goal: square.goal,
    colors: maskToColors(colorMask),
    color,
    remove
  })
}

/**
 * Switches the player's color and carries their own marks along: a square moves when the most
 * recent mark in the old color on it was made by this player. Teammates' marks stay.
 */
/** Renames a square's goal text (blank boards, typos) and pushes the new board to everyone. */
export async function editGoal(room: Room, player: Player, slot: number, name: string) {
  const db = useDb()
  const game = await currentGame(room)
  const square = await db.query.squares.findFirst({ where: { gameId: game.id, slot } })
  if (!square) throw createError({ statusCode: 400, statusMessage: 'Invalid slot' })
  await db.update(squares).set({ goal: name }).where(eq(squares.id, square.id))
  await recordAndPublish(room, player, { type: 'edit', slot, name })
  hubBroadcast(room.id, { type: 'board', squares: await loadBoard(game) })
}

export async function changeColor(room: Room, player: Player, color: PlayerColor) {
  const db = useDb()
  const oldColor = player.color
  await db.update(players).set({ color }).where(eq(players.id, player.id))

  let moved = 0
  if (oldColor !== color && !player.spectator) {
    const game = await currentGame(room)
    const rows = await db.query.squares.findMany({ where: { gameId: game.id } })
    const goalEvents = await db.query.events.findMany({
      where: { roomId: room.id, type: 'goal', createdAt: { gte: game.createdAt } },
      orderBy: { createdAt: 'desc', id: 'desc' }
    })
    const lastMarkerBySlot = new Map<number, string>()
    for (const ev of goalEvents) {
      const p = ev.payload
      if (p.type !== 'goal' || p.color !== oldColor || lastMarkerBySlot.has(p.slot)) continue
      if (!p.remove) lastMarkerBySlot.set(p.slot, ev.playerId)
      else lastMarkerBySlot.set(p.slot, '')
    }
    for (const square of rows) {
      const colors = new Set(maskToColors(square.colorMask))
      if (!colors.has(oldColor) || lastMarkerBySlot.get(square.slot) !== player.id) continue
      colors.delete(oldColor)
      colors.add(color)
      await db.update(squares).set({ colorMask: colorsToMask(colors) }).where(eq(squares.id, square.id))
      moved++
    }
  }

  await recordAndPublish(room, { ...player, color }, { type: 'color', color, moved })
  if (moved > 0) hubBroadcast(room.id, { type: 'board', squares: await loadBoard(await currentGame(room)) })
}

export async function revealBoard(room: Room, player: Player): Promise<Game> {
  const db = useDb()
  const game = await currentGame(room)
  if (!game.revealedAt) await db.update(games).set({ revealedAt: new Date() }).where(eq(games.id, game.id))
  await recordAndPublish(room, player, { type: 'revealed' })
  return { ...game, revealedAt: game.revealedAt ?? new Date() }
}

/** Recomputes the cached active flag and player count from live sockets and stored players. */
export async function refreshRoomCounters(roomId: string) {
  const db = useDb()
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(players).where(eq(players.roomId, roomId))
  const active = hubConnectedPlayerIds(roomId).length > 0
  await db.update(rooms).set({ active, playerCount: total }).where(eq(rooms.id, roomId))
}

async function creatorsForRooms(roomIds: string[]): Promise<Map<string, string>> {
  if (roomIds.length === 0) return new Map()
  const rows = await useDb().select({ roomId: players.roomId, name: players.name })
    .from(players).where(inArray(players.roomId, roomIds)).orderBy(asc(players.createdAt), asc(players.id))
  const creators = new Map<string, string>()
  for (const row of rows) if (!creators.has(row.roomId)) creators.set(row.roomId, row.name)
  return creators
}

async function gamesForRooms(roomList: Room[]): Promise<Map<string, Game>> {
  const ids = roomList.map(r => r.currentGameId).filter((id): id is number => id !== null)
  if (ids.length === 0) return new Map()
  const rows = await useDb().query.games.findMany({ where: { id: { in: ids } } })
  return new Map(rows.map(g => [g.roomId, g]))
}

export async function listActiveRooms(): Promise<RoomListEntry[]> {
  const db = useDb()
  const active = await db.query.rooms.findMany({ where: { active: true, listed: true } })
  const [creators, current] = await Promise.all([creatorsForRooms(active.map(r => r.id)), gamesForRooms(active)])
  const now = Date.now()
  const entries = active.map<RoomListEntry>((room) => {
    const game = current.get(room.id)
    return {
      inviteCode: room.inviteCode,
      name: room.name,
      creator: creators.get(room.id) ?? '',
      game: gameInfo(game?.variant ?? 18),
      connectedPlayers: hubConnectedPlayerIds(room.id).length,
      idle: now - room.lastEventAt.getTime() > STALE_THRESHOLD_MS
    }
  })
  // Busy rooms first, idle rooms last, names as a tiebreaker.
  return entries.sort((a, b) =>
    Number(a.idle) - Number(b.idle) || b.connectedPlayers - a.connectedPlayers || a.name.localeCompare(b.name)
  )
}

export const HISTORY_PAGE_SIZE = 10

export async function listHistory(page: number, hideSolo: boolean): Promise<{ rooms: HistoryEntry[], page: number, pages: number }> {
  const db = useDb()
  const where = hideSolo ? and(eq(rooms.listed, true), gt(rooms.playerCount, 1)) : eq(rooms.listed, true)
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(rooms).where(where)
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pages)
  const rows = await db.select().from(rooms).where(where)
    .orderBy(desc(rooms.createdAt), desc(rooms.id)).limit(HISTORY_PAGE_SIZE).offset((current - 1) * HISTORY_PAGE_SIZE)
  const [creators, gamesById] = await Promise.all([creatorsForRooms(rows.map(r => r.id)), gamesForRooms(rows)])
  const list = rows.map<HistoryEntry>((room) => {
    const game = gamesById.get(room.id)
    return {
      inviteCode: room.inviteCode,
      name: room.name,
      creator: creators.get(room.id) ?? '',
      createdAt: room.createdAt.getTime(),
      game: gameInfo(game?.variant ?? 18),
      seed: game ? (isSeedHidden(room, game) ? null : game.seed) : null,
      players: room.playerCount
    }
  })
  return { rooms: list, page: current, pages }
}

export async function roomCreatorName(roomId: string): Promise<string> {
  return (await creatorsForRooms([roomId])).get(roomId) ?? ''
}

