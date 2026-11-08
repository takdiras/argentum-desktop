import { describe, expect, it } from 'vitest'
import { cutoutRect, sameCutout } from './stackCutout'

describe('cutoutRect', () => {
  it('grows the panel by the padding on every side', () => {
    expect(cutoutRect({ left: 100, top: 200, width: 300, height: 400 }, 4)).toEqual({ x: 96, y: 196, width: 308, height: 408 })
  })

  it('rounds to whole pixels so sub-pixel wobble is not a change', () => {
    expect(cutoutRect({ left: 100.4, top: 200.6, width: 300.2, height: 400.2 }, 0)).toEqual({ x: 100, y: 201, width: 300, height: 400 })
  })

  it('is nothing without a panel, or with an empty one', () => {
    expect(cutoutRect(null)).toBeNull()
    expect(cutoutRect({ left: 0, top: 0, width: 0, height: 50 })).toBeNull()
  })
})

describe('sameCutout', () => {
  it('compares by value, and null only equals null', () => {
    const a = { x: 1, y: 2, width: 3, height: 4 }
    expect(sameCutout(a, { ...a })).toBe(true)
    expect(sameCutout(a, { ...a, width: 5 })).toBe(false)
    expect(sameCutout(null, null)).toBe(true)
    expect(sameCutout(a, null)).toBe(false)
  })
})
