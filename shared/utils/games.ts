import { GAME_GROUPS, GAME_VARIANTS, type GameGroup, type GameVariant } from './games.generated'

// A board with 25 empty squares that players fill in from inside the room. Not part of the
// upstream registry, so it lives outside the generated id range.
export const BLANK_ID = 10000
const BLANK_VARIANT: GameVariant = {
  id: BLANK_ID, key: 'blank', group: BLANK_ID, name: 'Blank board', shortName: 'Blank',
  variantName: 'Normal', hidden: false, custom: false, usesSeed: false
}
const BLANK_GROUP: GameGroup = { id: BLANK_ID, name: 'Blank board (type the goals yourself)', variants: [BLANK_ID] }

const variantsById = new Map([...GAME_VARIANTS, BLANK_VARIANT].map(v => [v.id, v]))
const groupsById = new Map([...GAME_GROUPS, BLANK_GROUP].map(g => [g.id, g]))

export const CUSTOM_GROUP_ID = 18
export const CUSTOM_FIXED_ID = 18
export const CUSTOM_RANDOMIZED_ID = 172
export const CUSTOM_SRL_V5_ID = 187
export const CUSTOM_ISAAC_ID = 188

export function getVariant(id: number): GameVariant | undefined {
  return variantsById.get(id)
}

export function requireVariant(id: number): GameVariant {
  const variant = variantsById.get(id)
  if (!variant) throw new Error(`Unknown game variant: ${id}`)
  return variant
}

export function getGroup(id: number): GameGroup | undefined {
  return groupsById.get(id)
}

export function variantsForGroup(groupId: number): GameVariant[] {
  const group = groupsById.get(groupId)
  if (!group) return []
  return group.variants.map(id => variantsById.get(id)!).filter(v => !v.hidden)
}

// Sort key that ignores leading articles, mirroring the upstream dropdown order.
function stripArticles(name: string): string {
  if (name.startsWith('The ')) return name.slice(4)
  if (name.startsWith('A ')) return name.slice(2)
  return name
}

// Options for the "Game" dropdown: every non-custom group sorted by name, then Custom last.
export const GAME_CHOICES: GameGroup[] = [
  ...GAME_GROUPS.filter(g => g.id !== CUSTOM_GROUP_ID).sort((a, b) =>
    stripArticles(a.name).toLowerCase().localeCompare(stripArticles(b.name).toLowerCase())
  ),
  groupsById.get(CUSTOM_GROUP_ID)!,
  BLANK_GROUP
]

export function isCustomVariant(id: number): boolean {
  return variantsById.get(id)?.custom ?? false
}
