import { z } from 'zod'
import { PLAYER_COLORS } from './colors'
import { getVariant } from './games'

export const ROOM_NAME_MAX = 255
export const PLAYER_NAME_MAX = 50
export const SEED_MAX = 2147483647

const variantId = z.number().int().refine(id => !!getVariant(id), 'Unknown game')

const seedField = z.union([z.literal(''), z.null(), z.undefined(), z.coerce.number().int().min(0).max(SEED_MAX)])
  .transform(v => (v === '' || v === null || v === undefined ? undefined : v))

export const newCardSchema = z.object({
  variant: variantId,
  lockout: z.boolean().default(false),
  hideCard: z.boolean().default(false),
  seed: seedField,
  customJson: z.string().default('')
})

export const createRoomSchema = newCardSchema.extend({
  name: z.string().trim().min(1, 'Room name is required').max(ROOM_NAME_MAX),
  nickname: z.string().trim().min(1, 'Nickname is required').max(PLAYER_NAME_MAX),
  spectator: z.boolean().default(false),
  listed: z.boolean().default(true),
  twitchOnly: z.boolean().default(false)
})

export const joinRoomSchema = z.object({
  nickname: z.string().trim().min(1, 'Nickname is required').max(PLAYER_NAME_MAX),
  spectator: z.boolean().default(false)
})

export const playerColorSchema = z.enum(PLAYER_COLORS)

export const selectGoalSchema = z.object({
  slot: z.number().int().min(1).max(25),
  color: playerColorSchema,
  remove: z.boolean()
})

export const chatSchema = z.object({
  text: z.string().min(1).max(4000)
})

export const colorSchema = z.object({ color: playerColorSchema })

export const editGoalSchema = z.object({
  slot: z.number().int().min(1).max(25),
  name: z.string().trim().max(255)
})

export type CreateRoomForm = z.input<typeof createRoomSchema>
export type NewCardInput = z.input<typeof newCardSchema>
export type JoinRoomInput = z.input<typeof joinRoomSchema>
