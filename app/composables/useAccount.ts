import type { TwitchProfile } from '#shared/types'

/**
 * Who is signed in with wervt (any provider), and their Twitch account if they linked one.
 * Playing never needs an account: rooms only ask for Twitch when they are Twitch-only.
 */
export function useAccount() {
  const wervtUser = useWervtUser()
  const admin = useState<boolean>('bingosync-admin', () => false)
  const user = computed(() => {
    const u = wervtUser.value
    if (!u) return null
    const twitchId = u.accounts?.twitch
    const name = u.name ?? u.email
    const twitch: TwitchProfile | undefined = twitchId
      ? { id: twitchId, login: name.toLowerCase(), displayName: name, avatar: u.image ?? '' }
      : undefined
    return { name, email: u.email, image: u.image, twitch }
  })
  return { user, admin }
}
