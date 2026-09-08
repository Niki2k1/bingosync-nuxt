export const PLAYER_COLORS = ['red', 'blue', 'green', 'orange', 'purple', 'navy', 'teal', 'pink', 'brown', 'yellow'] as const
export type PlayerColor = (typeof PLAYER_COLORS)[number]
export type SquareColor = PlayerColor | 'blank'

// Bit layout matches the upstream CompositeColor encoding so old boards stay readable.
export const COLOR_BITS: Record<PlayerColor, number> = {
  red: 1, blue: 2, green: 4, orange: 8, purple: 16, navy: 32, teal: 64, pink: 128, brown: 256, yellow: 512
}

// The order the board paints stacked colors in, and the order they are listed in tooltips.
export const COLOR_DISPLAY_ORDER: PlayerColor[] = ['pink', 'red', 'orange', 'brown', 'yellow', 'green', 'teal', 'blue', 'navy', 'purple']

export function isPlayerColor(value: unknown): value is PlayerColor {
  return typeof value === 'string' && (PLAYER_COLORS as readonly string[]).includes(value)
}

export function colorsToMask(colors: Iterable<PlayerColor>): number {
  let mask = 0
  for (const color of colors) mask |= COLOR_BITS[color]
  return mask
}

export function maskToColors(mask: number): PlayerColor[] {
  return COLOR_DISPLAY_ORDER.filter(color => (mask & COLOR_BITS[color]) !== 0)
}

export function sortColors(colors: Iterable<PlayerColor>): PlayerColor[] {
  const set = new Set(colors)
  return COLOR_DISPLAY_ORDER.filter(color => set.has(color))
}
