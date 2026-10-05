import { BLANK_ID, CUSTOM_FIXED_ID, CUSTOM_ISAAC_ID, CUSTOM_RANDOMIZED_ID, CUSTOM_SRL_V5_ID, requireVariant } from '#shared/utils/games'

export class GeneratorError extends Error {}
export class InvalidBoardError extends Error {}

export interface GeneratedSquare {
  name: string
}

type Goal = { name?: string, [key: string]: unknown }

/** Reads a generator source by its path inside generators/, e.g. `generator_bases/srl_generator_v5.js`. */
export type SourceLoader = (path: string) => Promise<string | undefined>

// The generators ship with the server as Nitro server assets (see nuxt.config.ts).
let loadSource: SourceLoader = async (path) => {
  const raw = await useStorage('assets:generators').getItemRaw(path.replaceAll('/', ':'))
  if (raw == null) return undefined
  return typeof raw === 'string' ? raw : new TextDecoder().decode(raw as Uint8Array)
}

/** Swaps where sources come from (tests read them from disk). */
export function setSourceLoader(loader: SourceLoader) {
  loadSource = loader
  sources.clear()
}

const sources = new Map<string, string>()
const REQUIRE_RE = /require\(\s*["']([^"']+)["']\s*\)/g

// Upstream paths look like "./generators/generator_bases/x.js" relative to the old app root;
// anything else is relative to the requiring file.
function resolvePath(request: string, from: string): string {
  if (request.startsWith('./generators/')) return request.slice('./generators/'.length)
  const parts = from.split('/').slice(0, -1)
  for (const part of request.split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '.') parts.push(part)
  }
  return parts.join('/')
}

/** Loads a generator and everything it requires, so the card can be built synchronously. */
async function preload(path: string, required = true) {
  if (sources.has(path)) return
  const code = await loadSource(path)
  if (code === undefined) {
    // A `require(...)` inside a goal text isn't a real dependency.
    if (required) throw new GeneratorError(`Generator source not found: ${path}`)
    return
  }
  sources.set(path, code)
  for (const [, request] of code.matchAll(REQUIRE_RE)) await preload(resolvePath(request!, path), false)
}

/**
 * A global object for one card. Reads fall through to the real globals; writes (the generators
 * assign `bingoGenerator`, `bingoList` and friends without declaring them) stay in the sandbox.
 * `Math` is a copy because seedrandom replaces `Math.random`.
 */
function createScope(globals: Record<string, unknown>) {
  const scope: Record<PropertyKey, unknown> = { Math: Object.create(Math), console, ...globals }
  return new Proxy(scope, {
    has: () => true,
    get: (target, key) => {
      if (key === Symbol.unscopables) return undefined
      return key in target ? target[key] : (globalThis as Record<PropertyKey, unknown>)[key]
    },
    set: (target, key, value) => {
      target[key] = value
      return true
    }
  })
}

type ModuleFn = (module: { exports: unknown }, exports: unknown, require: (request: string) => unknown) => unknown

// CommonJS-style wrapper inside `with (scope)`: the generators are sloppy-mode scripts written
// for a fresh `node -` process, and this keeps their globals off the server's own.
function compile(code: string, scope: object): ModuleFn {
  // eslint-disable-next-line no-new-func
  const factory = new Function('__scope', `with (__scope) { return function (module, exports, require) {\n${code}\n} }`)
  return factory(scope) as ModuleFn
}

/**
 * Runs a generator file the way upstream did (`node -` with the file plus
 * `bingoGenerator(bingoList, opts)`). Sources must be preloaded.
 *
 * There is no `vm` (and no script timeout) in the wervt isolate. The generators are fixed files
 * from this repo, and a runaway one is stopped by the isolate's CPU limit.
 */
function runGenerator(path: string, opts: Record<string, unknown>): unknown {
  const scope = createScope({ __opts: opts })
  const modules = new Map<string, { exports: unknown }>()
  const requireFrom = (from: string) => (request: string) => {
    const file = resolvePath(request, from)
    const cached = modules.get(file)
    if (cached) return cached.exports
    const module = { exports: {} as unknown }
    modules.set(file, module)
    compile(sources.get(file)!, scope).call(scope, module, module.exports, requireFrom(file))
    return module.exports
  }
  const main = compile(`${sources.get(path)!}\nreturn bingoGenerator(bingoList, __opts)`, scope)
  const module = { exports: {} }
  const result = main.call(scope, module, module.exports, requireFrom(path))
  // Values are copied through JSON so callers never hold objects tied to the sandbox.
  return JSON.parse(JSON.stringify(result))
}

function processCard(card: unknown): GeneratedSquare[] {
  if (!Array.isArray(card)) throw new GeneratorError('Generator did not return a list')
  // The SRL generators return a 26 element array with a null placeholder at index 0.
  const goals = card.length === 26 ? card.slice(1) : card
  if (goals.length !== 25) throw new GeneratorError(`Bad card length: ${goals.length}`)
  return goals.map((goal: Goal | null) => ({ name: String(goal?.name ?? '') }))
}

export async function generateCard(variantId: number, seed: number, customBoard?: unknown[]): Promise<GeneratedSquare[]> {
  const variant = requireVariant(variantId)
  if (variantId === BLANK_ID) return Array.from({ length: 25 }, () => ({ name: '' }))
  if (variantId === CUSTOM_FIXED_ID) return processCard(customBoard ?? [])
  const opts: Record<string, unknown> = { seed: String(seed) }
  if (customBoard) opts.custom_board = customBoard
  const path = `${variant.key}_generator.js`
  try {
    await preload(path)
    return processCard(runGenerator(path, opts))
  } catch (error) {
    if (error instanceof GeneratorError) throw error
    throw new GeneratorError(`Failed to generate a bingo board for game '${variant.key}': ${(error as Error).message}`)
  }
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
