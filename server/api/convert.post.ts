import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const { url } = await readValidated(event, z.object({ url: z.string().url() }))
  try {
    const js = await downloadAndConvert(url)
    setResponseHeader(event, 'Content-Type', 'application/javascript; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', 'attachment; filename="goal-list.js"')
    return js
  } catch (error) {
    if (error instanceof ConversionError) badRequest(error.message, 'url')
    throw error
  }
})
