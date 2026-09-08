/** Whether Twitch sign-in is configured on the server; loaded once per app in app.vue. */
export function useTwitchEnabled() {
  return useState<boolean>('twitch-enabled', () => false)
}
