import type { Peer } from 'crossws'
import type { SocketMessage } from '#shared/types'
import { newId } from './ids'

interface SocketTicket {
  roomId: string
  playerId: string
  overlay: boolean
  expiresAt: number
}

interface HubState {
  rooms: Map<string, Map<string, Set<Peer>>>
  /** read-only overlay sockets per room; they never count as connected players */
  overlays: Map<string, Set<Peer>>
  tickets: Map<string, SocketTicket>
  /** players whose last socket just closed; keyed by playerId */
  pendingLeaves: Map<string, ReturnType<typeof setTimeout>>
}

const TICKET_TTL_MS = 5 * 60 * 1000

// A page reload closes one socket and opens another within a second or two. Waiting briefly
// before treating the close as a departure keeps the feed free of "left / joined" pairs.
export const LEAVE_GRACE_MS = 4000

// Kept on globalThis so a dev-server HMR reload of this module does not drop live sockets.
const state: HubState = ((globalThis as { __bingosyncHub?: HubState }).__bingosyncHub ??= {
  rooms: new Map(),
  overlays: new Map(),
  tickets: new Map(),
  pendingLeaves: new Map()
})

export function issueSocketToken(roomId: string, playerId: string, overlay = false): string {
  const token = newId()
  state.tickets.set(token, { roomId, playerId, overlay, expiresAt: Date.now() + TICKET_TTL_MS })
  return token
}

export function consumeSocketToken(token: string): Omit<SocketTicket, 'expiresAt'> | undefined {
  const ticket = state.tickets.get(token)
  if (!ticket) return undefined
  state.tickets.delete(token)
  if (ticket.expiresAt < Date.now()) return undefined
  return { roomId: ticket.roomId, playerId: ticket.playerId, overlay: ticket.overlay }
}

export function purgeExpiredTokens() {
  const now = Date.now()
  for (const [token, ticket] of state.tickets) {
    if (ticket.expiresAt < now) state.tickets.delete(token)
  }
}

export function scheduleLeave(playerId: string, onLeave: () => void): void {
  const existing = state.pendingLeaves.get(playerId)
  if (existing) clearTimeout(existing)
  state.pendingLeaves.set(playerId, setTimeout(() => {
    state.pendingLeaves.delete(playerId)
    onLeave()
  }, LEAVE_GRACE_MS))
}

/** Cancels a pending departure; returns true when the player was about to be marked as gone. */
export function cancelLeave(playerId: string): boolean {
  const timer = state.pendingLeaves.get(playerId)
  if (!timer) return false
  clearTimeout(timer)
  state.pendingLeaves.delete(playerId)
  return true
}

/** Registers a player socket; returns true when this is the player's first open socket. */
export function hubRegister(roomId: string, playerId: string, peer: Peer): boolean {
  let room = state.rooms.get(roomId)
  if (!room) {
    room = new Map()
    state.rooms.set(roomId, room)
  }
  let sockets = room.get(playerId)
  const first = !sockets || sockets.size === 0
  if (!sockets) {
    sockets = new Set()
    room.set(playerId, sockets)
  }
  sockets.add(peer)
  peer.context.roomId = roomId
  peer.context.playerId = playerId
  return first
}

export function hubRegisterOverlay(roomId: string, peer: Peer) {
  let peers = state.overlays.get(roomId)
  if (!peers) {
    peers = new Set()
    state.overlays.set(roomId, peers)
  }
  peers.add(peer)
  peer.context.roomId = roomId
  peer.context.overlay = true
}

/** Removes a socket; returns the ids and whether the player has no sockets left. */
export function hubUnregister(peer: Peer): { roomId: string, playerId: string, last: boolean } | undefined {
  const roomId = peer.context.roomId as string | undefined
  if (!roomId) return undefined
  if (peer.context.overlay) {
    const peers = state.overlays.get(roomId)
    peers?.delete(peer)
    if (peers && peers.size === 0) state.overlays.delete(roomId)
    return undefined
  }
  const playerId = peer.context.playerId as string | undefined
  if (!playerId) return undefined
  const room = state.rooms.get(roomId)
  const sockets = room?.get(playerId)
  if (!room || !sockets) return { roomId, playerId, last: true }
  sockets.delete(peer)
  const last = sockets.size === 0
  if (last) room.delete(playerId)
  if (room.size === 0) state.rooms.delete(roomId)
  return { roomId, playerId, last }
}

function sendSafe(peer: Peer, data: string) {
  try {
    peer.send(data)
  } catch {
    // A dead peer is cleaned up by its own close handler.
  }
}

export function hubBroadcast(roomId: string, message: SocketMessage) {
  const data = JSON.stringify(message)
  for (const sockets of state.rooms.get(roomId)?.values() ?? []) {
    for (const peer of sockets) sendSafe(peer, data)
  }
  for (const peer of state.overlays.get(roomId) ?? []) sendSafe(peer, data)
}

export function hubBroadcastAll(message: SocketMessage) {
  for (const roomId of new Set([...state.rooms.keys(), ...state.overlays.keys()])) hubBroadcast(roomId, message)
}

export function hubConnectedPlayerIds(roomId: string): string[] {
  return [...(state.rooms.get(roomId)?.keys() ?? [])]
}

export function hubIsConnected(roomId: string, playerId: string): boolean {
  return (state.rooms.get(roomId)?.get(playerId)?.size ?? 0) > 0
}

export function hubActiveRoomIds(): string[] {
  return [...state.rooms.keys()]
}

export function hubDisconnectPlayer(roomId: string, playerId: string) {
  const sockets = state.rooms.get(roomId)?.get(playerId)
  if (!sockets) return
  for (const peer of [...sockets]) peer.close(4000, 'disconnected by admin')
}
