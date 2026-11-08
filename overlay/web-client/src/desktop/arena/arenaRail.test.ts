import { describe, expect, it } from 'vitest'
import {
  RAIL_ROW_CSS,
  RAIL_ROW_INSET_LEFT,
  RAIL_ROW_INSET_RIGHT,
  railChipsCondensed,
  railInitials,
  railIsHorizontal,
  railViewportIsCompact,
} from './arenaRail'

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

describe('railChipsCondensed', () => {
  it('condenses a six-seat row on an ordinary laptop window', () => {
    expect(railChipsCondensed(6, 1512)).toBe(true)
    expect(railChipsCondensed(6, 1280)).toBe(true)
  })

  it('keeps names while each seat still has room for one', () => {
    expect(railChipsCondensed(3, 1280)).toBe(false)
    expect(railChipsCondensed(4, 1512)).toBe(false)
    expect(railChipsCondensed(6, 2560)).toBe(false)
  })

  it('switches exactly where a seat falls under the named minimum', () => {
    const lane = (w: number) => w - RAIL_ROW_INSET_LEFT - RAIL_ROW_INSET_RIGHT - 190
    const width = 6 * 180 + (RAIL_ROW_INSET_LEFT + RAIL_ROW_INSET_RIGHT + 190)
    expect(lane(width) / 6).toBe(180)
    expect(railChipsCondensed(6, width)).toBe(false)
    expect(railChipsCondensed(6, width - 1)).toBe(true)
  })

  it('has nothing to condense without seats', () => {
    expect(railChipsCondensed(0, 800)).toBe(false)
  })
})

describe('railInitials', () => {
  it('takes the first letters of the first two words', () => {
    expect(railInitials('Cruel Optimus')).toBe('CO')
    expect(railInitials('Voltaic Mastermind Prime')).toBe('VM')
  })

  it('drops a leading bracketed tag', () => {
    expect(railInitials('[AI] Neural Butcher')).toBe('NB')
    expect(railInitials('[AI] Synapse')).toBe('SY')
  })

  it('takes two characters of a single word', () => {
    expect(railInitials('kabutakoo')).toBe('KA')
    expect(railInitials('Z')).toBe('Z')
  })

  it('splits on dashes and underscores and skips punctuation', () => {
    expect(railInitials('dark_lord-99')).toBe('DL')
    expect(railInitials('~~Ana~~')).toBe('AN')
  })

  it('handles non-latin names and gives up gracefully on nothing readable', () => {
    expect(railInitials('Éowyn Shieldmaiden')).toBe('ÉS')
    expect(railInitials('')).toBe('?')
    expect(railInitials('[AI]')).toBe('?')
    expect(railInitials('***')).toBe('?')
  })
})
