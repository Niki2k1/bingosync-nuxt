// Heartbeat from an open room page, every HEARTBEAT_MS (server/utils/presence.ts).
import { defineEventHandler, getRouterParam } from 'nuxt/server'
export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { player } = await requireRoomPlayer(event, id)
  await heartbeat(player)
  return { ok: true }
})
