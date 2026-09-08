import { useDb } from './db'

const FILLER_WORD = 'bingo'

/** Replaces admin-configured blacklisted patterns in user supplied names. */
export async function filterString(value: string): Promise<string> {
  const patterns = await useDb().query.filteredPatterns.findMany()
  let result = value
  for (const { pattern } of patterns) {
    try {
      result = result.replace(new RegExp(pattern, 'gi'), FILLER_WORD)
    } catch (error) {
      console.error(`Invalid filtered pattern ${JSON.stringify(pattern)}:`, error)
    }
  }
  return result
}
