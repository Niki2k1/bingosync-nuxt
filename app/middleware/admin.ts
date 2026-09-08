export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return
  const { user, fetch } = useUserSession()
  if (!user.value) await fetch()
  if (!user.value?.admin) return navigateTo(`/admin/login?returnTo=${encodeURIComponent(to.fullPath)}`)
})
