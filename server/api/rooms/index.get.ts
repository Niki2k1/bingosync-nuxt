export default defineEventHandler(async () => {
  return { rooms: await listActiveRooms() }
})
