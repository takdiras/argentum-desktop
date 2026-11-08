/**
 * Scroll behaviour of the stack panel under the arena layout, as plain functions.
 *
 * A long stack (a storm turn, a pile of triggers) is taller than the panel. Two things keep it
 * readable: the panel stays scrolled to its bottom, where the top of the stack (the item that
 * resolves next) sits, and the cards scrolled away above it pile up as thin strips pinned to the
 * panel's top edge rather than vanishing, so the further you scroll the denser that pile gets.
 * The pinning itself is CSS (`position: sticky` with the offsets below); this file only decides the
 * numbers.
 */

/** Gap between the panel's top edge and the first pinned strip. */
export const STACK_PIN_INSET = 4

/** Height of the strip each pinned card leaves visible before the next one covers it. */
export const STACK_PIN_STEP = 10

/** The most height all the pinned strips together may take, however long the stack is. */
export const STACK_PIN_MAX_TOTAL = 90

/** A strip thinner than this stops being recognisable as a card edge. */
export const STACK_PIN_MIN_STEP = 4

/** How far from the bottom (px) still counts as "at the bottom". */
export const STACK_BOTTOM_TOLERANCE = 24

/** Strip height per pinned card: full for a short stack, tighter as the stack grows. */
export function stackPinStep(slotCount: number): number {
  if (slotCount <= 1) return STACK_PIN_STEP
  const fitting = Math.floor(STACK_PIN_MAX_TOTAL / (slotCount - 1))
  return Math.max(STACK_PIN_MIN_STEP, Math.min(STACK_PIN_STEP, fitting))
}

/** The `top` offset at which slot `index` (0 = oldest, at the top) pins while scrolled away. */
export function stackPinTop(index: number, slotCount: number): number {
  return STACK_PIN_INSET + Math.max(0, index) * stackPinStep(slotCount)
}

/** Whether a scroll container is at (or within a hair of) its bottom edge. */
export function isScrolledToBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  tolerance: number = STACK_BOTTOM_TOLERANCE,
): boolean {
  return scrollHeight - (scrollTop + clientHeight) <= tolerance
}
