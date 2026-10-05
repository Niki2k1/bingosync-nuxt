import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import type { PlayerColor, SquareColor } from '#shared/utils/colors'
import type { EventPayload } from '#shared/types'

export type { EventPayload }

// Every table is read live by the room page through Electric shapes (server/api/rooms/[id]/shapes),
// so column names are what the client sees: keep them camelCase like the TypeScript keys.
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()

export const rooms = pgTable('rooms', {
  id: text().primaryKey(),
  name: text().notNull(),
  // The invite code is the only key to a room; it can be rotated without touching the room id.
  inviteCode: text().notNull(),
  listed: boolean().notNull().default(true),
  twitchOnly: boolean().notNull().default(false),
  createdAt: createdAt(),
  hideCard: boolean().notNull().default(false),
  playerCount: integer().notNull().default(0),
  currentGameId: integer(),
  lastEventAt: timestamp({ withTimezone: true }).notNull().defaultNow()
}, t => [
  uniqueIndex('rooms_invite_idx').on(t.inviteCode),
  index('rooms_created_players_idx').on(t.createdAt, t.playerCount)
])

export const games = pgTable('games', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  roomId: text().notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  // Never part of a shape: hidden cards keep their seed secret until revealed.
  seed: integer().notNull(),
  variant: integer().notNull(),
  lockout: boolean().notNull().default(false),
  createdAt: createdAt(),
  revealedAt: timestamp({ withTimezone: true })
}, t => [index('games_room_idx').on(t.roomId, t.createdAt)])

export const squares = pgTable('squares', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Denormalized so one shape per room covers the board across new cards.
  roomId: text().notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  gameId: integer().notNull().references(() => games.id, { onDelete: 'cascade' }),
  slot: integer().notNull(),
  goal: text().notNull(),
  colorMask: integer().notNull().default(0)
}, t => [
  uniqueIndex('squares_game_slot_idx').on(t.gameId, t.slot),
  index('squares_room_idx').on(t.roomId)
])

export const players = pgTable('players', {
  id: text().primaryKey(),
  roomId: text().notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  color: text().$type<PlayerColor>().notNull().default('red'),
  spectator: boolean().notNull().default(false),
  // Presence: the room page sends a heartbeat; players without one for a while go offline.
  online: boolean().notNull().default(false),
  lastSeenAt: timestamp({ withTimezone: true }),
  // Secret for the read-only OBS overlay URL of this player.
  overlayKey: text().notNull(),
  twitchId: text(),
  twitchLogin: text(),
  createdAt: createdAt()
}, t => [
  index('players_room_idx').on(t.roomId),
  index('players_online_idx').on(t.online)
])

export const events = pgTable('events', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  roomId: text().notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  playerId: text().notNull().references(() => players.id, { onDelete: 'cascade' }),
  type: text().$type<EventPayload['type']>().notNull(),
  playerColor: text().$type<SquareColor>().notNull(),
  createdAt: createdAt(),
  payload: jsonb().$type<EventPayload>().notNull()
}, t => [
  index('events_room_time_idx').on(t.roomId, t.createdAt),
  index('events_room_type_idx').on(t.roomId, t.type)
])

export const filteredPatterns = pgTable('filtered_patterns', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  pattern: text().notNull()
})

export type NoticeType = 'notice' | 'announcement' | 'warning' | 'error'

export const siteNotices = pgTable('site_notices', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: text().$type<NoticeType>().notNull().default('notice'),
  header: text().notNull().default(''),
  body: text().notNull().default(''),
  visibleToUsers: boolean().notNull().default(false),
  visibleToAdmins: boolean().notNull().default(false)
})

export type Room = typeof rooms.$inferSelect
export type Game = typeof games.$inferSelect
export type Square = typeof squares.$inferSelect
export type Player = typeof players.$inferSelect
export type EventRow = typeof events.$inferSelect
export type SiteNotice = typeof siteNotices.$inferSelect
