export interface TwitchProfile {
  id: string
  login: string
  displayName: string
  avatar: string
}

declare module '#auth-utils' {
  interface User {
    admin?: boolean
    twitch?: TwitchProfile
  }

  interface UserSession {
    // roomId -> playerId for every room this browser has joined
    rooms?: Record<string, string>
  }
}
