/**
 * The opponent's hand under the arena layout.
 *
 * Upstream gives it its own row of the board grid, a full small-card height tall, so the opponent's
 * battlefield starts below it. Its cards are face down and can't be clicked, so they don't need a
 * row: here the hand floats at the top of the window *behind* the opponent's battlefield (the arena
 * zones paint above it), and the grid row shrinks to a strip that keeps the top-corner controls clear.
 *
 * Your own hand is unchanged: it is something you click and read, and a hand covering your cards (or
 * your cards covering it) costs more than the row it saves.
 */

/** Never less than the fixed top-corner controls (Concede, the zone piles' column) need to stay clear. */
const OPPONENT_MIN_RESERVATION = 44

/** Fraction of a small card's height reserved for the opponent hand's peek. */
const OPPONENT_HAND_PEEK = 0.18

/** Height (px) of the grid row above the opponent's battlefield, in place of a whole small-card height. */
export function arenaOpponentHandReservation(smallCardHeight: number): number {
  return Math.max(OPPONENT_MIN_RESERVATION, Math.round(smallCardHeight * OPPONENT_HAND_PEEK))
}

/** z-index of the opponent's hand under the arena layout: below the zones (2), above the page. */
export const ARENA_OPPONENT_HAND_Z = 1

/**
 * Fraction of a seat cell's hand band tucked up behind the name plate. Tuned from how the fan sits: a
 * larger tuck pushed most of the cards above or behind the plate, where the cell's top edge clipped
 * them and only slivers showed; at this value roughly the lower half of each card is visible under the
 * plate, with the top of the fan clear of the edge, so the cards can still be counted at a glance.
 */
export const ARENA_HAND_TUCK = 0.43

/** Always leave at least this much of the band showing below the plate, so the cards stay countable. */
const MIN_HAND_PEEK = 40

/**
 * In a multi-seat cell the face-down hand normally hangs in its own band under the name plate, and the
 * board starts below that band. The arena layout tucks the fan up *behind* the plate (which already
 * paints above it) and shrinks the band by the same amount, handing that height to the board.
 *
 * Returns how many px to lift the fan and trim the band.
 */
export function arenaHandTuck(handBand: number): number {
  return Math.max(0, Math.min(Math.round(handBand * ARENA_HAND_TUCK), handBand - MIN_HAND_PEEK))
}

