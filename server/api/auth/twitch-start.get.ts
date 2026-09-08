// Remembers where to send the user back to, then hands off to the OAuth route.
export default defineEventHandler((event) => {
  const returnTo = String(getQuery(event).returnTo ?? '/')
  setCookie(event, 'bingosync-return-to', returnTo.startsWith('/') ? returnTo : '/', { path: '/', maxAge: 600, sameSite: 'lax' })
  return sendRedirect(event, '/auth/twitch')
})
