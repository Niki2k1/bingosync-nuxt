export default defineEventHandler(async (event) => {
  const id = requireIdParam('id', getRouterParam(event, 'id'))
  await forgetRoomPlayer(event, id)
  return { ok: true }
})
