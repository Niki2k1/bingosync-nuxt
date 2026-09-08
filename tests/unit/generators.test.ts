import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { GAME_VARIANTS } from '../../shared/utils/games.generated'

const ROOT = resolve(__dirname, '../..')
const GOLDEN = resolve(ROOT, 'tests/golden')
const SEEDS = [1, 1000, 1234, 12345]

// The generator module reads runtime config through Nitro's auto-import; stub it for plain vitest.
;(globalThis as Record<string, unknown>).useRuntimeConfig = () => ({ generatorsDir: resolve(ROOT, 'generators'), generatorTimeoutMs: 10_000 })

let generateCard: typeof import('../../server/utils/generator')['generateCard']
let validateCustomBoard: typeof import('../../server/utils/generator')['validateCustomBoard']
let GeneratorError: typeof import('../../server/utils/generator')['GeneratorError']

beforeAll(async () => {
  const mod = await import('../../server/utils/generator')
  generateCard = mod.generateCard
  validateCustomBoard = mod.validateCustomBoard
  GeneratorError = mod.GeneratorError
})

const goldenGames = readdirSync(GOLDEN)

describe('golden generator output', () => {
  const variants = GAME_VARIANTS.filter(v => !v.custom && goldenGames.includes(v.key))

  it('has golden data for every non-custom game', () => {
    const missing = GAME_VARIANTS.filter(v => !v.custom && !goldenGames.includes(v.key)).map(v => v.key)
    expect(missing).toEqual([])
  })

  for (const variant of variants) {
    for (const seed of SEEDS) {
      const file = resolve(GOLDEN, variant.key, `${seed}.json`)
      if (!existsSync(file)) continue
      it(`${variant.key} seed ${seed}`, () => {
        const expected = JSON.parse(readFileSync(file, 'utf8')) as { name: string }[]
        expect(generateCard(variant.id, seed)).toEqual(expected)
      })
    }
  }
})

describe('generator safety', () => {
  it('times out runaway scripts', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ generatorsDir: resolve(ROOT, 'tests/fixtures'), generatorTimeoutMs: 200 }))
    expect(() => generateCard(1, 1)).toThrow(GeneratorError)
    vi.unstubAllGlobals()
  })
})

describe('custom boards', () => {
  it('accepts a fixed 25 goal board', () => {
    const board = Array.from({ length: 25 }, (_, i) => ({ name: `goal ${i}` }))
    expect(validateCustomBoard(18, JSON.stringify(board))).toHaveLength(25)
    expect(generateCard(18, 0, board).map(s => s.name)).toEqual(board.map(g => g.name))
  })

  it('rejects malformed boards', () => {
    expect(() => validateCustomBoard(18, 'nope')).toThrow(/parse/)
    expect(() => validateCustomBoard(18, '[]')).toThrow(/exactly 25/)
    expect(() => validateCustomBoard(172, JSON.stringify([{ name: 'a' }]))).toThrow(/at least 25/)
  })

  it('randomizes a custom list deterministically', () => {
    const board = Array.from({ length: 40 }, (_, i) => ({ name: `goal ${i}` }))
    const a = generateCard(172, 42, validateCustomBoard(172, JSON.stringify(board)))
    const b = generateCard(172, 42, validateCustomBoard(172, JSON.stringify(board)))
    expect(a).toEqual(b)
    expect(new Set(a.map(s => s.name)).size).toBe(25)
  })
})
