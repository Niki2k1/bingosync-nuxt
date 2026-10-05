import * as v from 'valibot'
import { PLAYER_COLORS } from './colors'
import { getVariant } from './games'

export const ROOM_NAME_MAX = 255
export const PLAYER_NAME_MAX = 50
export const SEED_MAX = 2147483647

const variantId = v.pipe(v.number(), v.integer(), v.check(id => !!getVariant(id), 'Unknown game'))

// Blank means "pick one": the form sends '', null or nothing; numbers may come as strings.
const seedField = v.pipe(
  v.optional(v.nullable(v.union([v.literal(''), v.number(), v.string()]))),
  v.transform(value => (value === '' || value === null || value === undefined ? undefined : Number(value))),
  v.optional(v.pipe(v.number(), v.integer('Seed must be a whole number'), v.minValue(0), v.maxValue(SEED_MAX)))
)

const nickname = v.pipe(v.string(), v.trim(), v.nonEmpty('Nickname is required'), v.maxLength(PLAYER_NAME_MAX))

const newCardEntries = {
  variant: variantId,
  lockout: v.optional(v.boolean(), false),
  hideCard: v.optional(v.boolean(), false),
  seed: seedField,
  customJson: v.optional(v.string(), '')
}

export const newCardSchema = v.object(newCardEntries)

export const createRoomSchema = v.object({
  ...newCardEntries,
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Room name is required'), v.maxLength(ROOM_NAME_MAX)),
  nickname,
  spectator: v.optional(v.boolean(), false),
  listed: v.optional(v.boolean(), true),
  twitchOnly: v.optional(v.boolean(), false)
})

export const joinRoomSchema = v.object({
  nickname,
  spectator: v.optional(v.boolean(), false)
})

export const playerColorSchema = v.picklist(PLAYER_COLORS)

const slot = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(25))

export const selectGoalSchema = v.object({
  slot,
  color: playerColorSchema,
  remove: v.boolean()
})

export const chatSchema = v.object({
  text: v.pipe(v.string(), v.minLength(1), v.maxLength(4000))
})

export const colorSchema = v.object({ color: playerColorSchema })

export const editGoalSchema = v.object({
  slot,
  name: v.pipe(v.string(), v.trim(), v.maxLength(255))
})

export type CreateRoomForm = v.InferInput<typeof createRoomSchema>
export type NewCardInput = v.InferInput<typeof newCardSchema>
export type JoinRoomInput = v.InferInput<typeof joinRoomSchema>
