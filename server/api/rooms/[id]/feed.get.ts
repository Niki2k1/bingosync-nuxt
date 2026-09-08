export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room } = await requireRoomPlayer(event, id)
  const full = getQuery(event).full === 'true'
  const game = await currentGame(room)
  return loadFeed(room, full, isSeedHidden(room, game))
})
