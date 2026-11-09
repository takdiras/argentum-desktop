import { describe, expect, it } from 'vitest'
import { PRIORITY_FRAME_WIDTH, TURN_RING_WIDTH, holdsPriority } from './priorityFrameMetrics'

describe('holdsPriority', () => {
  it('is true for the seat that holds priority', () => {
    expect(holdsPriority('p1', 'p1', false)).toBe(true)
  })

  it('is false for every other seat', () => {
    expect(holdsPriority('p2', 'p1', false)).toBe(false)
  })

  it('is false when nobody holds priority', () => {
    expect(holdsPriority('p1', null, false)).toBe(false)
    expect(holdsPriority('p1', undefined, false)).toBe(false)
  })

  it('is false when the board has no known owner', () => {
    expect(holdsPriority(null, 'p1', false)).toBe(false)
    expect(holdsPriority(undefined, undefined, false)).toBe(false)
  })

  it('is false for a seat that has lost', () => {
    expect(holdsPriority('p1', 'p1', true)).toBe(false)
  })
})

describe('frame width', () => {
  it('is slightly thinner than the turn ring', () => {
    expect(PRIORITY_FRAME_WIDTH).toBeLessThan(TURN_RING_WIDTH)
    expect(PRIORITY_FRAME_WIDTH).toBeGreaterThan(0)
  })
})
