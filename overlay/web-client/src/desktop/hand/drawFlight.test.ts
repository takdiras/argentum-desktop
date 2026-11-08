import { describe, expect, it } from 'vitest'
import { DRAW_FLIP_MS, DRAW_FLY_MS, drawDuration, drawProgress, flipAngle } from './drawFlight'

describe('drawProgress', () => {
  it('starts at the library with the back showing', () => {
    expect(drawProgress(0, true)).toEqual({ fly: 0, flip: 0, done: false })
  })

  it('has not started turning over when it lands, then turns at the slot', () => {
    const landed = drawProgress(DRAW_FLY_MS, true)
    expect(landed.fly).toBe(1)
    expect(landed.flip).toBe(0)
    expect(landed.done).toBe(false)
    const mid = drawProgress(DRAW_FLY_MS + DRAW_FLIP_MS / 2, true)
    expect(mid.fly).toBe(1)
    expect(mid.flip).toBeGreaterThan(0)
    expect(mid.flip).toBeLessThan(1)
  })

  it('never turns while still flying', () => {
    for (let t = 0; t < DRAW_FLY_MS; t += 20) expect(drawProgress(t, true).flip).toBe(0)
  })

  it('ends face up after the flip', () => {
    const end = drawProgress(drawDuration(true), true)
    expect(end).toEqual({ fly: 1, flip: 1, done: true })
  })

  it('an opponent card only flies, and never flips', () => {
    expect(drawDuration(false)).toBe(DRAW_FLY_MS)
    const end = drawProgress(DRAW_FLY_MS, false)
    expect(end).toEqual({ fly: 1, flip: 0, done: true })
  })
})

describe('flipAngle', () => {
  it('runs from the back (0) to the face (180)', () => {
    expect(flipAngle(0)).toBe(0)
    expect(flipAngle(0.5)).toBe(90)
    expect(flipAngle(1)).toBe(180)
    expect(flipAngle(2)).toBe(180)
  })
})
