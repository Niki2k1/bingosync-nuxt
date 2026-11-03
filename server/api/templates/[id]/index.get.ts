import { defineEventHandler, getRouterParam } from 'nuxt/server'
import { useWervtUser } from '@wervt/nuxt/server'

// Anyone with the link may look at a template and start a room with it; editing stays with the owner.
export default defineEventHandler(async (event) => {
  const template = await requireTemplate(getRouterParam(event, 'id'))
  return templateToJson(template, useWervtUser(event))
})
