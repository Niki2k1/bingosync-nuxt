import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { GAME_VARIANTS } from '../../shared/utils/games.generated'

const ROOT = resolve(__dirname, '../..')
const GOLDEN = resolve(ROOT, 'tests/golden')
const SEEDS = [1, 1000, 1234, 12345]


let generateCard: typeof import('../../server/utils/generator')['generateCard']
let validateCustomBoard: typeof import('../../server/utils/generator')['validateCustomBoard']
let GeneratorError: typeof import('../../server/utils/generator')['GeneratorError']

beforeAll(async () => {
  const mod = await import('../../server/utils/generator')
  // On the server the sources come from Nitro server assets; here straight from disk.
  mod.setSourceLoader(path => readFile(resolve(ROOT, 'generators', path), 'utf8').catch(() => undefined))
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
      it(`${variant.key} seed ${seed}`, async () => {
        const expected = JSON.parse(readFileSync(file, 'utf8')) as { name: string }[]
        expect(await generateCard(variant.id, seed)).toEqual(expected)
      })
    }
  }
})

describe('generator sandbox', () => {
  it('keeps generator globals and the seeded Math.random off the real globals', async () => {
    await generateCard(GAME_VARIANTS.find(v => v.key === 'celeste')!.id, 1234)
    expect('bingoGenerator' in globalThis).toBe(false)
    expect('bingoList' in globalThis).toBe(false)
    expect(Math.random.toString()).toContain('[native code]')
  })

  it('reports a missing generator as a GeneratorError', async () => {
    const mod = await import('../../server/utils/generator')
    mod.setSourceLoader(async () => undefined)
    await expect(generateCard(GAME_VARIANTS.find(v => v.key === 'celeste')!.id, 1)).rejects.toThrow(GeneratorError)
    mod.setSourceLoader(path => readFile(resolve(ROOT, 'generators', path), 'utf8').catch(() => undefined))
  })
})

describe('custom boards', () => {
  it('accepts a fixed 25 goal board', async () => {
    const board = Array.from({ length: 25 }, (_, i) => ({ name: `goal ${i}` }))
    expect(validateCustomBoard(18, JSON.stringify(board))).toHaveLength(25)
    expect((await generateCard(18, 0, board)).map(s => s.name)).toEqual(board.map(g => g.name))
  })

  it('rejects malformed boards', () => {
    expect(() => validateCustomBoard(18, 'nope')).toThrow(/parse/)
    expect(() => validateCustomBoard(18, '[]')).toThrow(/exactly 25/)
    expect(() => validateCustomBoard(172, JSON.stringify([{ name: 'a' }]))).toThrow(/at least 25/)
  })

  it('randomizes a custom list deterministically', async () => {
    const board = Array.from({ length: 40 }, (_, i) => ({ name: `goal ${i}` }))
    const a = await generateCard(172, 42, validateCustomBoard(172, JSON.stringify(board)))
    const b = await generateCard(172, 42, validateCustomBoard(172, JSON.stringify(board)))
    expect(a).toEqual(b)
    expect(new Set(a.map(s => s.name)).size).toBe(25)
  })
})
