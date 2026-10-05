import type { PlayerColor, SquareColor } from '../utils/colors'

export interface PlayerJson {
  id: string
  name: string
  color: SquareColor
  spectator: boolean
}

export interface SquareJson {
  slot: number
  name: string
  colors: PlayerColor[]
}

export interface GameInfo {
  variant: number
  group: number
  name: string
  groupName: string
  variantName: string
  shortName: string
}

export interface RoomSettings {
  hideCard: boolean
  lockout: boolean
  seed: number | null
  game: GameInfo
}

interface EventBase {
  id: number
  timestamp: number
  player: PlayerJson
  playerColor: SquareColor
}

export type FeedEvent = EventBase & (
  | { type: 'chat', text: string }
  | { type: 'goal', square: SquareJson, color: PlayerColor, remove: boolean }
  | { type: 'color', color: PlayerColor, moved: number }
  | { type: 'revealed' }
  | { type: 'connection', status: 'connected' | 'disconnected' }
  | { type: 'new-card', game: string, seed: number | null, showSeed: boolean, hideCard: boolean, isCurrent: boolean }
  | { type: 'edit', slot: number, name: string }
)

export type FeedEventType = FeedEvent['type']

/** What an event row stores; the feed renders it as a FeedEvent. */
export type EventPayload =
  | { type: 'chat', text: string }
  | { type: 'goal', slot: number, goal: string, colors: PlayerColor[], color: PlayerColor, remove: boolean }
  | { type: 'color', color: PlayerColor, moved?: number }
  | { type: 'revealed' }
  | { type: 'connection', status: 'connected' | 'disconnected' }
  // `seed` is left out while the card is hidden: events are streamed to every player as they are.
  | { type: 'new-card', variant: number, seed?: number, hideCard: boolean }
  | { type: 'edit', slot: number, name: string }

// Rows as the room page receives them from the Electric shapes (server/api/rooms/[id]/shapes).
// Timestamps arrive as Postgres text.
export interface RoomRow {
  id: string
  name: string
  inviteCode?: string
  listed: boolean
  twitchOnly: boolean
  hideCard: boolean
  currentGameId: number | null
  [key: string]: unknown
}

export interface GameRow {
  id: number
  roomId: string
  variant: number
  lockout: boolean
  createdAt: string
  revealedAt: string | null
  [key: string]: unknown
}

export interface SquareRow {
  id: number
  roomId: string
  gameId: number
  slot: number
  goal: string
  colorMask: number
  [key: string]: unknown
}

export interface PlayerRow {
  id: string
  roomId: string
  name: string
  color: PlayerColor
  spectator: boolean
  online: boolean
  createdAt: string
  [key: string]: unknown
}

export interface EventShapeRow {
  id: number
  roomId: string
  playerId: string
  type: EventPayload['type']
  playerColor: SquareColor
  createdAt: string
  payload: EventPayload
  [key: string]: unknown
}

export interface RoomListEntry {
  inviteCode: string
  name: string
  creator: string
  game: GameInfo
  connectedPlayers: number
  idle: boolean
}

export interface HistoryEntry {
  inviteCode: string
  name: string
  creator: string
  createdAt: number
  game: GameInfo
  seed: number | null
  players: number
}

export interface SiteNoticeJson {
  id: number
  type: 'notice' | 'announcement' | 'warning' | 'error'
  header: string
  body: string
}

/** What an invite link reveals before joining. */
export interface InviteView {
  name: string
  creator: string
  game: GameInfo
  twitchOnly: boolean
  /** set when this browser already has a player in the room */
  playerId: string | null
}

/** Everything the room page needs for a player this browser owns. */
export interface PlayView {
  roomId: string
  name: string
  creator: string
  inviteCode: string
  listed: boolean
  twitchOnly: boolean
  player: PlayerJson
  settings: RoomSettings
  overlayKey: string
}

/** Read-only data for the OBS overlay. */
export interface OverlayView {
  roomId: string
  name: string
  player: PlayerJson
  settings: RoomSettings
}

export interface TwitchProfile {
  id: string
  login: string
  displayName: string
  avatar: string
}
