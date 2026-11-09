import { describe, expect, it } from 'vitest'
import {
  RAIL_ROW_CSS,
  RAIL_ROW_INSET_LEFT,
  RAIL_ROW_INSET_RIGHT,
  cameraControlsInCorner,
  handLimitSuffix,
  plateDodge,
  railChipsCondensed,
  railInitials,
  railIsHorizontal,
  railRowHidden,
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

describe('cameraControlsInCorner', () => {
  it('moves them out of the row for a player at a row-rail table', () => {
    expect(cameraControlsInCorner({ rowRail: true, multiplayer: true, spectating: false })).toBe(true)
  })
  it('keeps them in the rail for a spectator, a column rail or a two-player game', () => {
    expect(cameraControlsInCorner({ rowRail: true, multiplayer: true, spectating: true })).toBe(false)
    expect(cameraControlsInCorner({ rowRail: false, multiplayer: true, spectating: false })).toBe(false)
    expect(cameraControlsInCorner({ rowRail: true, multiplayer: false, spectating: false })).toBe(false)
  })
})

describe('railRowHidden', () => {
  const base = { inCorner: true, multiView: true, platesOnEverySeat: true, livingOpponentIds: ['a', 'b'], visibleIds: ['a', 'b', 'me'] }
  it('hides the row when every living opponent board is on screen', () => {
    expect(railRowHidden(base)).toBe(true)
  })
  it('keeps it when a board is missing (collapsed cell, focused camera)', () => {
    expect(railRowHidden({ ...base, visibleIds: ['a', 'me'] })).toBe(false)
  })
  it('keeps it outside the all-boards view or when the controls are not in the corner', () => {
    expect(railRowHidden({ ...base, multiView: false })).toBe(false)
    expect(railRowHidden({ ...base, inCorner: false })).toBe(false)
  })
  it('keeps it while a seat has no plate (the center orb stands in for it)', () => {
    expect(railRowHidden({ ...base, platesOnEverySeat: false })).toBe(false)
  })
})

describe('handLimitSuffix', () => {
  it('is empty at the default limit', () => {
    expect(handLimitSuffix(7)).toBe('')
    expect(handLimitSuffix(undefined)).toBe('')
  })
  it('shows no maximum as infinity and a finite cap as a number', () => {
    expect(handLimitSuffix(null)).toBe('/∞')
    expect(handLimitSuffix(4)).toBe('/4')
  })
})

describe('plateDodge', () => {
  const concede = { left: 1700, right: 1988, top: 12, bottom: 47 }
  it('is zero when the plate is clear of every zone', () => {
    expect(plateDodge({ left: 1000, right: 1200, top: 16, bottom: 40 }, [concede])).toBe(0)
    expect(plateDodge({ left: 1750, right: 1900, top: 60, bottom: 84 }, [concede])).toBe(0)
  })
  it('moves a plate under a zone down to just below it', () => {
    expect(plateDodge({ left: 1550, right: 1725, top: 16, bottom: 40 }, [concede])).toBe(47 + 6 - 16)
  })
  it('takes the largest need across zones', () => {
    const left = { left: 0, right: 170, top: 0, bottom: 48 }
    expect(plateDodge({ left: 100, right: 300, top: 10, bottom: 34 }, [concede, left])).toBe(48 + 6 - 10)
  })
})
