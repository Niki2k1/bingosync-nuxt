import { chatSchema } from '../../../../shared/utils/schemas'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'chat', 20, 10_000)
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room, player } = await requireRoomPlayer(event, id)
  const input = await readValidated(event, chatSchema)
  await recordAndPublish(room, player, { type: 'chat', text: input.text })
  return { ok: true }
})
