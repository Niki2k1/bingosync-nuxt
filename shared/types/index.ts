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

export type SocketMessage =
  | { type: 'event', event: FeedEvent }
  | { type: 'board', squares: SquareJson[] }
  | { type: 'ping' }
  | { type: 'error', error: string }
  | { type: 'joined', roomId: string }

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
  players: PlayerJson[]
  settings: RoomSettings
  socketToken: string
  overlayKey: string
}

/** Read-only data for the OBS overlay. */
export interface OverlayView {
  roomId: string
  name: string
  player: PlayerJson
  players: PlayerJson[]
  settings: RoomSettings
  board: SquareJson[]
  socketToken: string
}

export interface TwitchProfile {
  id: string
  login: string
  displayName: string
  avatar: string
}
