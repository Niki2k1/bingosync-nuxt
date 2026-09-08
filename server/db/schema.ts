import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import type { PlayerColor, SquareColor } from '../../shared/utils/colors'

const timestamp = () => integer({ mode: 'timestamp_ms' })

export const rooms = sqliteTable('rooms', {
  id: text().primaryKey(),
  name: text().notNull(),
  // The invite code is the only key to a room; it can be rotated without touching the room id.
  inviteCode: text().notNull(),
  listed: integer({ mode: 'boolean' }).notNull().default(true),
  twitchOnly: integer({ mode: 'boolean' }).notNull().default(false),
  createdAt: timestamp().notNull().$defaultFn(() => new Date()),
  active: integer({ mode: 'boolean' }).notNull().default(false),
  hideCard: integer({ mode: 'boolean' }).notNull().default(false),
  playerCount: integer().notNull().default(0),
  currentGameId: integer(),
  lastEventAt: timestamp().notNull().$defaultFn(() => new Date())
}, t => [
  uniqueIndex('rooms_invite_idx').on(t.inviteCode),
  index('rooms_active_idx').on(t.active),
  index('rooms_created_players_idx').on(t.createdAt, t.playerCount)
])

export const games = sqliteTable('games', {
  id: integer().primaryKey({ autoIncrement: true }),
  roomId: text().notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  seed: integer().notNull(),
  variant: integer().notNull(),
  lockout: integer({ mode: 'boolean' }).notNull().default(false),
  createdAt: timestamp().notNull().$defaultFn(() => new Date()),
  revealedAt: timestamp()
}, t => [index('games_room_idx').on(t.roomId, t.createdAt)])

export const squares = sqliteTable('squares', {
  id: integer().primaryKey({ autoIncrement: true }),
  gameId: integer().notNull().references(() => games.id, { onDelete: 'cascade' }),
  slot: integer().notNull(),
  goal: text().notNull(),
  colorMask: integer().notNull().default(0)
}, t => [uniqueIndex('squares_game_slot_idx').on(t.gameId, t.slot)])

export const players = sqliteTable('players', {
  id: text().primaryKey(),
  roomId: text().notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  color: text().$type<PlayerColor>().notNull().default('red'),
  spectator: integer({ mode: 'boolean' }).notNull().default(false),
  // Secret for the read-only OBS overlay URL of this player.
  overlayKey: text().notNull(),
  twitchId: text(),
  twitchLogin: text(),
  createdAt: timestamp().notNull().$defaultFn(() => new Date())
}, t => [index('players_room_idx').on(t.roomId)])

export type EventPayload =
  | { type: 'chat', text: string }
  | { type: 'goal', slot: number, goal: string, colors: PlayerColor[], color: PlayerColor, remove: boolean }
  | { type: 'color', color: PlayerColor, moved?: number }
  | { type: 'revealed' }
  | { type: 'connection', status: 'connected' | 'disconnected' }
  | { type: 'new-card', variant: number, seed: number, hideCard: boolean }
  | { type: 'edit', slot: number, name: string }

export const events = sqliteTable('events', {
  id: integer().primaryKey({ autoIncrement: true }),
  roomId: text().notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  playerId: text().notNull().references(() => players.id, { onDelete: 'cascade' }),
  type: text().$type<EventPayload['type']>().notNull(),
  playerColor: text().$type<SquareColor>().notNull(),
  createdAt: timestamp().notNull().$defaultFn(() => new Date()),
  payload: text({ mode: 'json' }).$type<EventPayload>().notNull()
}, t => [
  index('events_room_time_idx').on(t.roomId, t.createdAt),
  index('events_room_type_idx').on(t.roomId, t.type)
])

export const filteredPatterns = sqliteTable('filtered_patterns', {
  id: integer().primaryKey({ autoIncrement: true }),
  pattern: text().notNull()
})

export type NoticeType = 'notice' | 'announcement' | 'warning' | 'error'

export const siteNotices = sqliteTable('site_notices', {
  id: integer().primaryKey({ autoIncrement: true }),
  type: text().$type<NoticeType>().notNull().default('notice'),
  header: text().notNull().default(''),
  body: text().notNull().default(''),
  visibleToUsers: integer({ mode: 'boolean' }).notNull().default(false),
  visibleToAdmins: integer({ mode: 'boolean' }).notNull().default(false)
})

export type Room = typeof rooms.$inferSelect
export type Game = typeof games.$inferSelect
export type Square = typeof squares.$inferSelect
export type Player = typeof players.$inferSelect
export type EventRow = typeof events.$inferSelect
export type SiteNotice = typeof siteNotices.$inferSelect
