export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  const { room } = await requireRoomPlayer(event, id)
  return { inviteCode: await rotateInvite(room) }
})
