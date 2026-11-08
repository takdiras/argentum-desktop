import { describe, expect, it } from 'vitest'
import { NAVY_HUE, isPurple, retintPurples, rgbToHsl, toNavy } from '../../../desktop-midnight-theme.mjs'

type Rgb = readonly [number, number, number]
const hue = (rgb: Rgb) => rgbToHsl(rgb[0], rgb[1], rgb[2])[0]
const lightness = (rgb: Rgb) => rgbToHsl(rgb[0], rgb[1], rgb[2])[2]

describe('isPurple', () => {
  it('recognises the purples the client uses', () => {
    expect(isPurple(100, 50, 150)).toBe(true) // stack panel
    expect(isPurple(150, 100, 200)).toBe(true) // its border
    expect(isPurple(124, 58, 237)).toBe(true) // #7c3aed
    expect(isPurple(184, 168, 204)).toBe(true) // #b8a8cc, pale lavender text
  })

  it('leaves greys, blues, greens, reds and golds alone', () => {
    expect(isPurple(128, 128, 128)).toBe(false)
    expect(isPurple(14, 16, 26)).toBe(false) // already-navy chrome
    expect(isPurple(33, 150, 243)).toBe(false) // blue
    expect(isPurple(0, 170, 0)).toBe(false) // green
    expect(isPurple(255, 140, 66)).toBe(false) // orange
    expect(isPurple(255, 204, 102)).toBe(false) // gold
    expect(isPurple(255, 255, 255)).toBe(false)
  })
})

describe('toNavy', () => {
  it('moves purples to the navy hue', () => {
    for (const [r, g, b] of [[100, 50, 150], [124, 58, 237], [184, 168, 204]] as const) {
      expect(Math.abs(hue(toNavy(r, g, b)) - NAVY_HUE)).toBeLessThan(3)
    }
  })

  it('makes dark purples darker, so panels read almost black', () => {
    expect(lightness(toNavy(100, 50, 150))).toBeLessThan(lightness([100, 50, 150]))
    expect(lightness(toNavy(40, 22, 64))).toBeLessThan(0.15)
  })

  it('keeps pale lavender text light and readable', () => {
    expect(lightness(toNavy(224, 212, 240))).toBeGreaterThan(0.8)
  })
})

describe('retintPurples', () => {
  it('rewrites purple rgba() and keeps the alpha', () => {
    const out = retintPurples("background: 'rgba(100, 50, 150, 0.3)'", false)
    expect(out).not.toContain('100, 50, 150')
    expect(out).toMatch(/rgba\(\d+, \d+, \d+, 0\.3\)/)
  })

  it('leaves non-purple colours untouched, byte for byte', () => {
    const src = "const a = 'rgba(0, 0, 0, 0.85)'; const b = 'rgba(255, 204, 102, 0.5)'; const c = '#ffcc66'; const d = '#888'"
    expect(retintPurples(src, false)).toBe(src)
  })

  it('rewrites a complete quoted purple hex in code', () => {
    const out = retintPurples("color: '#b088d0', border: \"#7c3aed\"", false)
    expect(out).not.toMatch(/b088d0|7c3aed/i)
    expect(out).toMatch(/color: '#[0-9a-f]{6}'/)
  })

  it('never touches a hex that code builds an alpha suffix onto', () => {
    const src = 'const glow = `${seatColor}55` + "#7c3aed55"'
    expect(retintPurples(src, false)).toBe(src)
  })

  it('rewrites bare purple hex in stylesheets', () => {
    expect(retintPurples('.x { color: #7c3aed; background: #fff; }', true)).toMatch(/color: #[0-9a-f]{6}; background: #fff;/)
    expect(retintPurples('.x { color: #7c3aed; }', true)).not.toMatch(/7c3aed/i)
  })

  it('is idempotent: navy is not purple, so a second pass changes nothing', () => {
    const once = retintPurples("x: 'rgba(100, 50, 150, 0.3)', y: '#b088d0'", false)
    expect(retintPurples(once, false)).toBe(once)
  })
})
