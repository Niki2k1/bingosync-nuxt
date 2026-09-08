export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const { twitch: _twitch, ...rest } = session.user ?? {}
  await replaceUserSession(event, { rooms: session.rooms ?? {}, user: rest.admin ? { admin: true } : undefined })
  return { ok: true }
})
