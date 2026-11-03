import { defineEventHandler, getRouterParam } from 'nuxt/server'
import { newCardSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room, player } = await requireRoomPlayer(event, id)
  const input = await readValidated(event, newCardSchema)
  const card = await resolveCardSource(input)
  try {
    const game = await newCard(room, player, { ...input, ...card })
    return roomSettings({ ...room, hideCard: input.hideCard }, game)
  } catch (error) {
    if (error instanceof GeneratorError) badRequest(error.message, 'variant')
    throw error
  }
})
