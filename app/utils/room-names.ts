const ADJECTIVES = ['Cozy', 'Chaotic', 'Sneaky', 'Golden', 'Frantic', 'Lucky', 'Rusty', 'Sleepy', 'Spicy', 'Turbo', 'Wobbly', 'Mighty', 'Grumpy', 'Shiny', 'Salty', 'Speedy', 'Hidden', 'Cursed', 'Frosty', 'Rapid']
const NOUNS = ['Goomba', 'Cassette', 'Strawberry', 'Warp Pipe', 'Bonfire', 'Hookshot', 'Skip', 'Split', 'Reset', 'Frame', 'Any%', 'Backflip', 'Chest', 'Checkpoint', 'Powerup', 'Seed', 'Glitch', 'Clip', 'Save', 'Route']

/** A friendly default room name like "Cozy Goomba Bingo" so a room can be created with one click. */
export function generateRoomName(): string {
  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]!
  return `${pick(ADJECTIVES)} ${pick(NOUNS)} Bingo`
}

const NICKNAME_KEY = 'bingosync-nickname'

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveNickname(name: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, name)
  } catch {
    // Storage can be unavailable (private mode); remembering the name is only a convenience.
  }
}
