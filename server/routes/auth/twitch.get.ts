export default defineOAuthTwitchEventHandler({
  async onSuccess(event, { user }) {
    const session = await getUserSession(event)
    await setUserSession(event, {
      ...session,
      user: {
        ...(session.user ?? {}),
        twitch: { id: user.id, login: user.login, displayName: user.display_name, avatar: user.profile_image_url }
      }
    })
    const returnTo = getCookie(event, 'bingosync-return-to') || '/'
    deleteCookie(event, 'bingosync-return-to')
    return sendRedirect(event, returnTo.startsWith('/') ? returnTo : '/')
  },
  onError(event, error) {
    console.error('Twitch login failed', error)
    return sendRedirect(event, '/?twitch=failed')
  }
})
