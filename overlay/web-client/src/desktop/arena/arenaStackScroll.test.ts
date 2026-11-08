import { describe, expect, it } from 'vitest'
import {
  STACK_BOTTOM_TOLERANCE,
  STACK_PIN_INSET,
  STACK_PIN_MAX_TOTAL,
  STACK_PIN_MIN_STEP,
  STACK_PIN_STEP,
  isScrolledToBottom,
  stackPinStep,
  stackPinTop,
} from './arenaStackScroll'

describe('stackPinStep', () => {
  it('gives a short stack the full strip', () => {
    expect(stackPinStep(1)).toBe(STACK_PIN_STEP)
    expect(stackPinStep(4)).toBe(STACK_PIN_STEP)
  })

  it('tightens as the stack grows, so the pinned strips never take more than the cap', () => {
    for (const n of [5, 8, 14, 20, 30]) {
      const step = stackPinStep(n)
      expect(step).toBeLessThanOrEqual(STACK_PIN_STEP)
      expect((n - 1) * step).toBeLessThanOrEqual(Math.max(STACK_PIN_MAX_TOTAL, (n - 1) * STACK_PIN_MIN_STEP))
    }
    expect(stackPinStep(14)).toBeLessThan(stackPinStep(5))
  })

  it('never goes thinner than a recognisable card edge', () => {
    expect(stackPinStep(200)).toBe(STACK_PIN_MIN_STEP)
  })
})

describe('stackPinTop', () => {
  it('pins the oldest card at the inset and each newer one a step lower', () => {
    expect(stackPinTop(0, 14)).toBe(STACK_PIN_INSET)
    expect(stackPinTop(3, 14) - stackPinTop(2, 14)).toBe(stackPinStep(14))
  })

  it('is increasing with the index, so a newer card always covers an older one', () => {
    const tops = Array.from({ length: 14 }, (_, i) => stackPinTop(i, 14))
    expect([...tops].sort((a, b) => a - b)).toEqual(tops)
  })

  it('treats a negative index as the first slot', () => {
    expect(stackPinTop(-2, 5)).toBe(STACK_PIN_INSET)
  })
})

describe('isScrolledToBottom', () => {
  it('is true exactly at the bottom', () => {
    expect(isScrolledToBottom(400, 600, 1000)).toBe(true)
  })

  it('tolerates a few pixels of slack', () => {
    expect(isScrolledToBottom(400 - STACK_BOTTOM_TOLERANCE, 600, 1000)).toBe(true)
  })

  it('is false once scrolled clearly away from the bottom', () => {
    expect(isScrolledToBottom(100, 600, 1000)).toBe(false)
  })

  it('is true when the content fits and there is nothing to scroll', () => {
    expect(isScrolledToBottom(0, 600, 500)).toBe(true)
  })
})
