import { z } from 'zod'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { pattern } = await readValidated(event, z.object({ pattern: z.string().trim().min(1).max(255) }))
  try {
    new RegExp(pattern, 'gi')
  } catch (error) {
    badRequest(`Invalid regular expression: ${(error as Error).message}`, 'pattern')
  }
  const [row] = await useDb().insert(schema.filteredPatterns).values({ pattern }).returning()
  return row
})
