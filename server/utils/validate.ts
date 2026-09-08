import type { H3Event } from 'h3'
import type { z } from 'zod'

/** Parses the JSON body with a zod schema and turns validation issues into a 400 with a readable message. */
export async function readValidated<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.output<T>> {
  const body = await readBody(event).catch(() => ({}))
  const result = schema.safeParse(body ?? {})
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue?.path.join('.')
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      message: field ? `${field}: ${issue?.message}` : issue?.message ?? 'Invalid request',
      data: { field, issues: result.error.issues }
    })
  }
  return result.data
}

export function badRequest(message: string, field?: string): never {
  throw createError({ statusCode: 400, statusMessage: 'Bad request', message, data: { field } })
}
