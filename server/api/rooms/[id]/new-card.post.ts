import { newCardSchema } from '../../../../shared/utils/schemas'

export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room, player } = await requireRoomPlayer(event, id)
  const input = await readValidated(event, newCardSchema)
  let customBoard: unknown[] | undefined
  try {
    customBoard = validateCustomBoard(input.variant, input.customJson)
  } catch (error) {
    if (error instanceof InvalidBoardError) badRequest(error.message, 'customJson')
    throw error
  }
  try {
    const game = await newCard(room, player, { ...input, customBoard })
    return roomSettings({ ...room, hideCard: input.hideCard }, game)
  } catch (error) {
    if (error instanceof GeneratorError) badRequest(error.message, 'variant')
    throw error
  }
})
