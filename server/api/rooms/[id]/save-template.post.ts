import { createError, defineEventHandler, getRouterParam } from 'nuxt/server'
import { saveTemplateSchema } from '#shared/utils/schemas'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room } = await requireRoomPlayer(event, id)
  const { name } = await readValidated(event, saveTemplateSchema)
  const game = await currentGame(room)
  // Saving would hand out goals the room has not seen yet.
  if (isSeedHidden(room, game)) throw createError({ statusCode: 409, statusMessage: 'Reveal the card before saving it' })
  const squares = await useDb().query.squares.findMany({ where: { gameId: game.id }, orderBy: { slot: 'asc' } })
  if (!squares.some(s => s.goal.trim())) badRequest('The board has no goals yet', 'name')
  const template = await createTemplate(user, { name, mode: 'fixed', goals: squares.map(s => s.goal.trim()) })
  return templateToJson(template, user)
})
