import { defineEventHandler } from 'nuxt/server'
import { createRoomSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'create-room', 10, 60_000)
  const input = await readValidated(event, createRoomSchema)
  const twitch = getTwitch(event)
  if (input.twitchOnly && !twitch) badRequest('Sign in with Twitch to make a Twitch-only room', 'twitchOnly')
  const card = await resolveCardSource(input)
  try {
    const { room, creator } = await createRoom({ ...input, ...card, twitch })
    await rememberRoomPlayer(event, room.id, creator.id)
    return { roomId: room.id, playerId: creator.id, inviteCode: room.inviteCode }
  } catch (error) {
    if (error instanceof GeneratorError) badRequest(error.message, 'variant')
    throw error
  }
})
