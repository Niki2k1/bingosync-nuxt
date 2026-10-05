export default defineNuxtRouteMiddleware((to) => {
  const { user, admin } = useAccount()
  if (!user.value) return navigateTo(wervtLoginUrl(to.fullPath), { external: true })
  if (!admin.value) throw createError({ statusCode: 403, statusMessage: `${user.value.email} is not a Bingosync admin`, fatal: true })
})
