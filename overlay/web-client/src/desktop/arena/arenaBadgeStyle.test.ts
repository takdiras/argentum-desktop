import { describe, expect, it } from 'vitest'
import { ARENA_BADGE_OVERHANG } from './arenaMetrics'
import { arenaPtBadgeHeight, arenaPtBadgeStyle, arenaPtHang } from './arenaBadgeStyle'

describe('arenaPtBadgeStyle', () => {
  it('sizes the badge from one font size with a unit line-height, so padding is even', () => {
    const s = arenaPtBadgeStyle(11)
    expect(s.fontSize).toBe(11)
    expect(s.lineHeight).toBe(1)
    expect(s.display).toBe('inline-flex')
    expect(s.alignItems).toBe('center')
    // Equal top and bottom padding: "<v>px <h>px" has no separate bottom value.
    expect(String(s.padding).split(' ')).toHaveLength(2)
  })
})

describe('arenaPtHang', () => {
  it('is half the badge height', () => {
    expect(arenaPtBadgeHeight(12)).toBe(20)
    expect(arenaPtHang(12)).toBe(10)
  })

  it('never exceeds the overhang every row reserves, at any text size the layout produces', () => {
    for (const fontSize of [9, 10, 11, 12, 13]) expect(arenaPtHang(fontSize)).toBeLessThanOrEqual(ARENA_BADGE_OVERHANG)
  })
})
