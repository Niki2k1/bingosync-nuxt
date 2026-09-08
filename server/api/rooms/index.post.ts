import { createRoomSchema } from '../../../shared/utils/schemas'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'create-room', 10, 60_000)
  const input = await readValidated(event, createRoomSchema)
  const session = await getUserSession(event)
  const twitch = session.user?.twitch
  if (input.twitchOnly && !twitch) badRequest('Sign in with Twitch to make a Twitch-only room', 'twitchOnly')
  let customBoard: unknown[] | undefined
  try {
    customBoard = validateCustomBoard(input.variant, input.customJson)
  } catch (error) {
    if (error instanceof InvalidBoardError) badRequest(error.message, 'customJson')
    throw error
  }
  try {
    const { room, creator } = await createRoom({ ...input, customBoard, twitch: twitch ? { id: twitch.id, login: twitch.login } : undefined })
    await rememberRoomPlayer(event, room.id, creator.id)
    return { roomId: room.id, playerId: creator.id, inviteCode: room.inviteCode }
  } catch (error) {
    if (error instanceof GeneratorError) badRequest(error.message, 'variant')
    throw error
  }
})
