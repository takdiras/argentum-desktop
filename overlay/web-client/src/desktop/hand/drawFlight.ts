/**
 * Timeline of one drawn card, in plain numbers so it is unit-testable.
 *
 *   1. it flies from the library to its slot in the hand, back showing
 *   2. it turns over there (a card in your own hand is face up)
 *
 * An opponent's card only does the first part: their hand is face down.
 */

/** Library → slot. */
export const DRAW_FLY_MS = 520
/** The turn over at the slot, after the flight. */
export const DRAW_FLIP_MS = 320

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t))
const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export interface DrawProgress {
  /** 0 at the library, 1 at the slot (eased). */
  fly: number
  /** 0 back showing, 1 face showing (eased). Always 0 when the card doesn't flip. */
  flip: number
  done: boolean
}

export const drawDuration = (flips: boolean): number => DRAW_FLY_MS + (flips ? DRAW_FLIP_MS : 0)

export function drawProgress(elapsedMs: number, flips: boolean): DrawProgress {
  return {
    fly: easeInOutCubic(clamp01(elapsedMs / DRAW_FLY_MS)),
    flip: flips ? easeInOutCubic(clamp01((elapsedMs - DRAW_FLY_MS) / DRAW_FLIP_MS)) : 0,
    done: elapsedMs >= drawDuration(flips),
  }
}

/** Degrees the card has turned about its vertical axis: 0 = back, 180 = face. */
export const flipAngle = (flip: number): number => 180 * clamp01(flip)

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t
