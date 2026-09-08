export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room, player } = await requireRoomPlayer(event, id)
  const game = await revealBoard(room, player)
  return { seed: game.seed }
})
