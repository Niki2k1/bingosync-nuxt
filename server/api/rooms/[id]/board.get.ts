export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const room = await requireRoom(id)
  return loadBoard(await currentGame(room))
})
