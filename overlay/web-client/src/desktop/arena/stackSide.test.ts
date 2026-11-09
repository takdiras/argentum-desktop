import { describe, expect, it } from 'vitest'
import { YIELD_MENU_WIDTH, parseStackSide, stackAnchorStyle, stackEdgeInset, yieldMenuX } from './stackSide'

const desktop = { isMobile: false, viewportWidth: 1920 }
const tablet = { isMobile: false, viewportWidth: 1000 }
const phone = { isMobile: true, viewportWidth: 390 }

describe('stackEdgeInset', () => {
  it('keeps upstream numbers: tight on a phone, a little room on a tablet, clear of the orb on a desktop', () => {
    expect(stackEdgeInset(phone)).toBe(12)
    expect(stackEdgeInset(tablet)).toBe(16)
    expect(stackEdgeInset(desktop)).toBe(120)
  })

  it('switches to the wide inset at 1200px', () => {
    expect(stackEdgeInset({ isMobile: false, viewportWidth: 1199 })).toBe(16)
    expect(stackEdgeInset({ isMobile: false, viewportWidth: 1200 })).toBe(120)
  })
})

describe('stackAnchorStyle', () => {
  it('pins a left stack with `left` only, exactly where upstream put it', () => {
    expect(stackAnchorStyle('left', desktop)).toEqual({ left: 120 })
  })

  it('mirrors it for a right stack with `right` only, so the panel grows inward', () => {
    expect(stackAnchorStyle('right', desktop)).toEqual({ right: 120 })
    expect(stackAnchorStyle('right', phone)).toEqual({ right: 12 })
  })
})

describe('yieldMenuX', () => {
  const button = { left: 400, right: 430 }

  it('opens to the right of a left stack', () => {
    expect(yieldMenuX('left', button)).toBe(438)
  })

  it('opens to the left of a right stack, ending 8px before the button', () => {
    const x = yieldMenuX('right', button)
    expect(x).toBe(400 - 8 - YIELD_MENU_WIDTH)
    expect(x + YIELD_MENU_WIDTH).toBe(button.left - 8)
  })
})

describe('parseStackSide', () => {
  it('reads "right", and anything else (nothing stored, a stale value) is the default left', () => {
    expect(parseStackSide('right')).toBe('right')
    expect(parseStackSide('left')).toBe('left')
    expect(parseStackSide(null)).toBe('left')
    expect(parseStackSide('middle')).toBe('left')
  })
})
