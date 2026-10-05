import { defineEventHandler } from 'nuxt/server'
import * as v from 'valibot'

export default defineEventHandler(async (event) => {
  const { url } = await readValidated(event, v.object({ url: v.pipe(v.string(), v.url()) }))
  try {
    const js = await downloadAndConvert(url)
    event.res.headers.set('Content-Type', 'application/javascript; charset=utf-8')
    event.res.headers.set('Content-Disposition', 'attachment; filename="goal-list.js"')
    return js
  } catch (error) {
    if (error instanceof ConversionError) badRequest(error.message, 'url')
    throw error
  }
})
