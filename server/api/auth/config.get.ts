// Tells the client which optional sign-in methods this server has credentials for.
export default defineEventHandler(() => {
  const { twitch } = useRuntimeConfig().oauth
  return { twitchEnabled: Boolean(twitch.clientId && twitch.clientSecret) }
})
