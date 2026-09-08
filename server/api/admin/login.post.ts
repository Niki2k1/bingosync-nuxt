import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const { password } = await readValidated(event, z.object({ password: z.string() }))
  const expected = useRuntimeConfig().adminPassword
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'Admin login is disabled: NUXT_ADMIN_PASSWORD is not set' })
  if (password !== expected) throw createError({ statusCode: 401, statusMessage: 'Wrong password' })
  const session = await getUserSession(event)
  await setUserSession(event, { ...session, user: { admin: true } })
  return { ok: true }
})
