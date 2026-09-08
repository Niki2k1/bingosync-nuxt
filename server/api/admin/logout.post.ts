export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  await replaceUserSession(event, { rooms: session.rooms ?? {} })
  return { ok: true }
})
