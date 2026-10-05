import { defineEventHandler, createError, getRouterParam } from 'nuxt/server'
import { joinRoomSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'join-room', 30, 60_000)
  const code = requireIdParam('code', getRouterParam(event, 'code'))
  const room = await findRoomByInvite(code)
  if (!room) throw createError({ statusCode: 404, statusMessage: 'This invite link is not valid anymore' })
  const input = await readValidated(event, joinRoomSchema)
  const twitch = getTwitch(event)
  if (room.twitchOnly && !twitch) throw createError({ statusCode: 403, statusMessage: 'This room only lets people in who are signed in with Twitch' })

  const existingId = await getSessionPlayerId(event, room.id)
  if (existingId) return { playerId: existingId }

  const player = await joinRoom(room, input.nickname, input.spectator, twitch)
  await rememberRoomPlayer(event, room.id, player.id)
  return { playerId: player.id }
})
