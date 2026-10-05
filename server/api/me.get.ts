// What the client may know about the signed-in visitor beyond the wervt user itself.
import { defineEventHandler } from 'nuxt/server'
export default defineEventHandler(event => ({ admin: isAdmin(event) }))
