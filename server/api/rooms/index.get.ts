import { defineEventHandler } from 'nuxt/server'
export default defineEventHandler(async () => {
  return { rooms: await listActiveRooms() }
})
