import { describe, expect, it } from 'vitest'
import { colorsToMask, maskToColors, sortColors } from '../../shared/utils/colors'

describe('composite colors', () => {
  it('round-trips through the bitmask', () => {
    expect(maskToColors(colorsToMask(['blue', 'red']))).toEqual(['red', 'blue'])
    expect(maskToColors(0)).toEqual([])
    expect(colorsToMask([])).toBe(0)
  })

  it('keeps the upstream bit layout', () => {
    expect(colorsToMask(['red'])).toBe(1)
    expect(colorsToMask(['yellow'])).toBe(512)
    expect(colorsToMask(['red', 'blue', 'green'])).toBe(7)
  })

  it('sorts in display order', () => {
    expect(sortColors(['purple', 'pink', 'green'])).toEqual(['pink', 'green', 'purple'])
  })
})
