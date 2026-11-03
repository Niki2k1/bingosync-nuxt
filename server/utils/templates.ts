import { createError, type RequestEvent } from 'nuxt/server'
import { and, eq } from 'drizzle-orm'
import { useWervtUser, type WervtUser } from '@wervt/nuxt/server'
import { schema, useDb } from './db'
import { newId, isValidId } from './ids'
import { InvalidBoardError, validateCustomBoard } from './generator'
import { badRequest } from './validate'
import { CUSTOM_FIXED_ID, CUSTOM_RANDOMIZED_ID } from '#shared/utils/games'
import type { Template } from '../db/schema'
import type { TemplateJson, TemplateMode, TemplateSummary } from '#shared/types'

const { templates } = schema

export interface TemplateData {
  name: string
  mode: TemplateMode
  goals: string[]
}

export function requireUser(event: RequestEvent): WervtUser {
  const user = useWervtUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to keep templates' })
  return user
}

// Shared links show the owner, so never fall back to the email address.
const displayName = (user: WervtUser) => user.name?.trim() || 'Anonymous'

export function templateSummary(t: Template): TemplateSummary {
  return { id: t.id, name: t.name, mode: t.mode, goalCount: t.goals.filter(Boolean).length, updatedAt: t.updatedAt.getTime() }
}

export function templateToJson(t: Template, user: WervtUser | undefined): TemplateJson {
  return { ...templateSummary(t), goals: t.goals, ownerName: t.ownerName, mine: user?.id === t.ownerId }
}

export async function findTemplate(id: string | undefined): Promise<Template | undefined> {
  if (!isValidId(id)) return undefined
  return useDb().query.templates.findFirst({ where: { id } })
}

export async function requireTemplate(id: string | undefined): Promise<Template> {
  const template = await findTemplate(id)
  if (!template) throw createError({ statusCode: 404, statusMessage: 'Template not found' })
  return template
}

/** The template if the signed-in user owns it; 404 otherwise, so ids of others stay unconfirmed. */
export async function requireOwnTemplate(event: RequestEvent, id: string | undefined): Promise<{ template: Template, user: WervtUser }> {
  const user = requireUser(event)
  const template = await findTemplate(id)
  if (!template || template.ownerId !== user.id) throw createError({ statusCode: 404, statusMessage: 'Template not found' })
  return { template, user }
}

export function listTemplates(ownerId: string): Promise<Template[]> {
  return useDb().query.templates.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } })
}

export async function createTemplate(user: WervtUser, data: TemplateData): Promise<Template> {
  const [template] = await useDb().insert(templates)
    .values({ id: newId(), ownerId: user.id, ownerName: displayName(user), ...data })
    .returning()
  return template!
}

export async function updateTemplate(template: Template, user: WervtUser, data: TemplateData): Promise<Template> {
  const [updated] = await useDb().update(templates)
    .set({ ...data, ownerName: displayName(user), updatedAt: new Date() })
    .where(and(eq(templates.id, template.id), eq(templates.ownerId, user.id)))
    .returning()
  return updated!
}

export async function deleteTemplate(template: Template) {
  await useDb().delete(templates).where(eq(templates.id, template.id))
}

/** The variant and board a room plays when it starts from the template. */
export function templateCard(template: Template): { variant: number, customBoard: { name: string }[] } {
  return {
    variant: template.mode === 'fixed' ? CUSTOM_FIXED_ID : CUSTOM_RANDOMIZED_ID,
    customBoard: template.goals.map(name => ({ name }))
  }
}

/**
 * Variant and board for a new card: from the template when one is given, otherwise from the
 * pasted custom JSON (if the variant takes one). Invalid input becomes a 400 on the right field.
 */
export async function resolveCardSource(input: { variant: number, customJson: string, templateId?: string }): Promise<{ variant: number, customBoard?: unknown[] }> {
  if (input.templateId) {
    const template = await findTemplate(input.templateId)
    if (!template) badRequest('That template does not exist anymore', 'templateId')
    return templateCard(template)
  }
  try {
    return { variant: input.variant, customBoard: validateCustomBoard(input.variant, input.customJson) }
  } catch (error) {
    if (error instanceof InvalidBoardError) badRequest(error.message, 'customJson')
    throw error
  }
}

