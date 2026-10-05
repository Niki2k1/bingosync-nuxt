import { defineEventHandler } from 'nuxt/server'
import * as v from 'valibot'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { pattern } = await readValidated(event, v.object({ pattern: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(255)) }))
  try {
    new RegExp(pattern, 'gi')
  } catch (error) {
    badRequest(`Invalid regular expression: ${(error as Error).message}`, 'pattern')
  }
  const [row] = await useDb().insert(schema.filteredPatterns).values({ pattern }).returning()
  return row
})
