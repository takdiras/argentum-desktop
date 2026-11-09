import { describe, expect, it } from 'vitest'
import {
  PRIORITY_FRAME_WIDTH,
  TURN_RING_WIDTH,
  areaRing,
  areaRingWidth,
  holdsPriority,
} from './priorityFrameMetrics'

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

describe('areaRing', () => {
  it('shows the priority ring only for a seat that holds priority off its own turn', () => {
    expect(areaRing(false, true)).toBe('priority')
    expect(areaRing(false, false)).toBe('none')
  })

  it('shows the turn ring, and never a second priority ring, on the seat whose turn it is', () => {
    expect(areaRing(true, false)).toBe('turn')
    expect(areaRing(true, true)).toBe('turn')
  })
})

describe('ring width', () => {
  it('draws the turn ring thicker than the priority ring', () => {
    expect(PRIORITY_FRAME_WIDTH).toBeGreaterThan(0)
    expect(TURN_RING_WIDTH).toBeGreaterThan(PRIORITY_FRAME_WIDTH)
    expect(areaRingWidth('turn')).toBe(TURN_RING_WIDTH)
    expect(areaRingWidth('priority')).toBe(PRIORITY_FRAME_WIDTH)
  })
})
