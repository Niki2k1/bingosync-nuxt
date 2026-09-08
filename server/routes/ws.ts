import type { Peer } from 'crossws'

async function handleAuth(peer: Peer, token: unknown) {
  const ticket = typeof token === 'string' ? consumeSocketToken(token) : undefined
  const player = ticket ? await findPlayer(ticket.playerId) : undefined
  if (!ticket || !player || player.roomId !== ticket.roomId) {
    peer.send(JSON.stringify({ type: 'error', error: 'unable to authenticate, try refreshing' }))
    return
  }
  if (ticket.overlay) {
    hubRegisterOverlay(ticket.roomId, peer)
    peer.send(JSON.stringify({ type: 'joined', roomId: ticket.roomId }))
    return
  }
  const first = hubRegister(ticket.roomId, player.id, peer)
  peer.send(JSON.stringify({ type: 'joined', roomId: ticket.roomId }))
  const rejoinedQuickly = cancelLeave(player.id)
  if (first && !rejoinedQuickly) {
    await recordAndPublish({ id: ticket.roomId }, player, { type: 'connection', status: 'connected' })
    await refreshRoomCounters(ticket.roomId)
  }
}

export default defineWebSocketHandler({
  async message(peer, message) {
    let data: { type?: string, token?: unknown }
    try {
      data = message.json()
    } catch {
      return
    }
    if (data.type === 'auth') await handleAuth(peer, data.token)
  },

  close(peer) {
    const left = hubUnregister(peer)
    if (!left?.last) return
    scheduleLeave(left.playerId, async () => {
      if (hubIsConnected(left.roomId, left.playerId)) return
      const player = await findPlayer(left.playerId)
      if (player) await recordAndPublish({ id: left.roomId }, player, { type: 'connection', status: 'disconnected' })
      await refreshRoomCounters(left.roomId)
    })
  }
})
