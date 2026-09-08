import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import vm from 'node:vm'
import { BLANK_ID, CUSTOM_FIXED_ID, CUSTOM_ISAAC_ID, CUSTOM_RANDOMIZED_ID, CUSTOM_SRL_V5_ID, requireVariant } from '#shared/utils/games'

export class GeneratorError extends Error {}
export class InvalidBoardError extends Error {}

export interface GeneratedSquare {
  name: string
}

type Goal = { name?: string, [key: string]: unknown }

const scriptCache = new Map<string, vm.Script>()

function loadScript(file: string): vm.Script {
  let script = scriptCache.get(file)
  if (!script) {
    script = new vm.Script(readFileSync(file, 'utf8'), { filename: file })
    scriptCache.set(file, script)
  }
  return script
}

function generatorsRoot(): string {
  return resolve(useRuntimeConfig().generatorsDir)
}

// The upstream generator files are plain scripts that assign `bingoGenerator` and `bingoList`
// as globals and `require()` their base generator with a path relative to the app root.
// They also monkey-patch Math.random via seedrandom, so every card gets a fresh context.
function runGenerator(gameKey: string, opts: Record<string, unknown>): unknown {
  const root = generatorsRoot()
  const timeout = useRuntimeConfig().generatorTimeoutMs
  const moduleCache = new Map<string, { exports: unknown }>()
  const context = vm.createContext({ console })

  const requireFromContext = (from: string) => (request: string) => {
    // Upstream paths look like "./generators/generator_bases/x.js" relative to the old app root.
    const rel = request.replace(/^\.\/generators\//, './')
    const file = request.startsWith('./generators/') ? resolve(root, rel) : resolve(dirname(from), request)
    const cached = moduleCache.get(file)
    if (cached) return cached.exports
    const module = { exports: {} as unknown }
    moduleCache.set(file, module)
    const wrapper = new vm.Script(`(function (module, exports, require) {${readFileSync(file, 'utf8')}\n})`, { filename: file })
    const fn = wrapper.runInContext(context, { timeout }) as (m: unknown, e: unknown, r: unknown) => void
    fn(module, module.exports, requireFromContext(file))
    return module.exports
  }

  const file = resolve(root, `${gameKey}_generator.js`)
  context.require = requireFromContext(file)
  context.module = { exports: {} }
  context.__opts = opts

  try {
    loadScript(file).runInContext(context, { timeout })
    const result = new vm.Script('bingoGenerator(bingoList, __opts)', { filename: `${gameKey}:eval` })
      .runInContext(context, { timeout })
    // Cross-realm values are copied through JSON so callers get ordinary arrays and objects.
    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    if (error instanceof Error && error.message.includes('Script execution timed out')) {
      throw new GeneratorError(`Took too long to generate a bingo board for game '${gameKey}'`)
    }
    throw new GeneratorError(`Failed to generate a bingo board for game '${gameKey}': ${(error as Error).message}`)
  }
}

function processCard(card: unknown): GeneratedSquare[] {
  if (!Array.isArray(card)) throw new GeneratorError('Generator did not return a list')
  // The SRL generators return a 26 element array with a null placeholder at index 0.
  const goals = card.length === 26 ? card.slice(1) : card
  if (goals.length !== 25) throw new GeneratorError(`Bad card length: ${goals.length}`)
  return goals.map((goal: Goal | null) => ({ name: String(goal?.name ?? '') }))
}

export function generateCard(variantId: number, seed: number, customBoard?: unknown[]): GeneratedSquare[] {
  const variant = requireVariant(variantId)
  if (variantId === BLANK_ID) return Array.from({ length: 25 }, () => ({ name: '' }))
  if (variantId === CUSTOM_FIXED_ID) return processCard(customBoard ?? [])
  const opts: Record<string, unknown> = { seed: String(seed) }
  if (customBoard) opts.custom_board = customBoard
  return processCard(runGenerator(variant.key, opts))
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1
}

// ---- custom board validation (ported from upstream custom_generator.py) ----

function validateSquare(index: number, square: unknown) {
  const label = JSON.stringify(square)
  if (typeof square !== 'object' || square === null || !('name' in square)) {
    throw new InvalidBoardError(`Square ${index + 1} (${label}) is missing a "name" attribute`)
  }
  const name = (square as Goal).name
  if (name === '') throw new InvalidBoardError(`Square ${index + 1} (${label}) has an empty "name" attribute`)
  if (typeof name !== 'string' || name.length > 255) {
    throw new InvalidBoardError(`Square ${index + 1} (${label}) has a "name" that is longer than 255 characters`)
  }
}

function validateTier(goals: unknown, tier: number) {
  if (!Array.isArray(goals)) throw new InvalidBoardError(`Element at difficulty tier ${tier} was not a list (found ${JSON.stringify(goals)})`)
  if (goals.length === 0) throw new InvalidBoardError(`Goal list at difficulty tier ${tier} was empty`)
  goals.forEach((goal, i) => {
    if (typeof goal !== 'object' || goal === null || !('name' in goal)) {
      throw new InvalidBoardError(`Goal ${i + 1} (${JSON.stringify(goal)}) in difficulty tier ${tier} is missing a "name" attribute`)
    }
    if ((goal as Goal).name === '') {
      throw new InvalidBoardError(`Goal ${i + 1} (${JSON.stringify(goal)}) in difficulty tier ${tier} has an empty "name" attribute`)
    }
  })
}

export function validateCustomBoard(variantId: number, customJson: string): unknown[] | undefined {
  const variant = requireVariant(variantId)
  if (!variant.custom) return undefined

  let board: unknown
  try {
    board = JSON.parse(customJson)
  } catch {
    throw new InvalidBoardError("Couldn't parse board json, check it with a JSON validator")
  }
  if (!Array.isArray(board)) throw new InvalidBoardError('Board must be a list')

  if (variantId === CUSTOM_FIXED_ID || variantId === CUSTOM_RANDOMIZED_ID) {
    if (variantId === CUSTOM_FIXED_ID && board.length !== 25) {
      throw new InvalidBoardError(`A fixed board must have exactly 25 goals (found ${board.length})`)
    }
    if (variantId === CUSTOM_RANDOMIZED_ID && board.length < 25) {
      throw new InvalidBoardError(`A randomized board must have at least 25 goals (found ${board.length})`)
    }
    board.forEach((square, i) => validateSquare(i, square))
    return board
  }

  if (variantId === CUSTOM_SRL_V5_ID) {
    if (board.length !== 25) throw new InvalidBoardError(`An SRL goal list must have exactly 25 tiers (found ${board.length})`)
    board.forEach((tier, i) => validateTier(tier, i + 1))
    return [null, ...board]
  }

  if (variantId === CUSTOM_ISAAC_ID) {
    if (board.length !== 4) throw new InvalidBoardError(`An Isaac goal list must have exactly 4 tiers (found ${board.length})`)
    board.forEach((tier, i) => validateTier(tier, i + 1))
    const minimums: [number, string][] = [[10, 'easy'], [10, 'medium'], [4, 'hard'], [1, 'very hard']]
    minimums.forEach(([min, label], i) => {
      if ((board[i] as unknown[]).length < min) {
        throw new InvalidBoardError(`An Isaac goal list must have at least ${min} ${label} goals (found ${(board[i] as unknown[]).length})`)
      }
    })
    return [null, ...board]
  }

  throw new InvalidBoardError('Unrecognized custom game type')
}
