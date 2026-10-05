import { defineEventHandler, getRouterParam } from 'nuxt/server'
export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const room = await requireRoom(id)
  return roomSettings(room, await currentGame(room))
})
