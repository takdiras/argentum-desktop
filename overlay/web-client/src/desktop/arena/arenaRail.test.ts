import { describe, expect, it } from 'vitest'
import { RAIL_ROW_CSS, RAIL_ROW_INSET_LEFT, RAIL_ROW_INSET_RIGHT, railIsHorizontal, railViewportIsCompact } from './arenaRail'

describe('railIsHorizontal', () => {
  it('is a row for the arena layout in an ordinary pod on a normal window', () => {
    expect(railIsHorizontal(true, false, false)).toBe(true)
  })

  it('stays a column in the classic layout, in team games, and on compact viewports', () => {
    expect(railIsHorizontal(false, false, false)).toBe(false)
    expect(railIsHorizontal(true, true, false)).toBe(false)
    expect(railIsHorizontal(true, false, true)).toBe(false)
  })
})

describe('railViewportIsCompact', () => {
  it('matches upstream: phones, and any window too short for the named column', () => {
    expect(railViewportIsCompact({ isMobile: true, viewportHeight: 900 })).toBe(true)
    expect(railViewportIsCompact({ isMobile: false, viewportHeight: 559 })).toBe(true)
    expect(railViewportIsCompact({ isMobile: false, viewportHeight: 560 })).toBe(false)
  })
})

describe('row geometry', () => {
  it('leaves room for the corner buttons on both sides', () => {
    expect(RAIL_ROW_INSET_LEFT).toBeGreaterThan(120)
    expect(RAIL_ROW_INSET_RIGHT).toBeGreaterThan(120)
  })

  it('lets chips shrink and keeps the trailing controls at their own width', () => {
    expect(RAIL_ROW_CSS).toContain('flex: 1 1 0')
    expect(RAIL_ROW_CSS).toContain('min-width: 0')
    expect(RAIL_ROW_CSS).toContain(':last-child')
  })
})
