import { createError, readBody, type RequestEvent } from 'nuxt/server'
import * as v from 'valibot'

/** Parses the JSON body with a valibot schema and turns the first issue into a 400 with a readable message. */
export async function readValidated<T extends v.GenericSchema>(event: RequestEvent, schema: T): Promise<v.InferOutput<T>> {
  const body = await readBody(event).catch(() => ({}))
  const result = v.safeParse(schema, body ?? {})
  if (!result.success) {
    const issue = result.issues[0]
    const field = v.getDotPath(issue) ?? undefined
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      message: field ? `${field}: ${issue.message}` : issue.message,
      data: { field, issues: result.issues.map(i => ({ path: v.getDotPath(i), message: i.message })) }
    })
  }
  return result.output
}

export function badRequest(message: string, field?: string): never {
  throw createError({ statusCode: 400, statusMessage: 'Bad request', message, data: { field } })
}
