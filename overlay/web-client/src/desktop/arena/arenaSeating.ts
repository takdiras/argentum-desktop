/**
 * Free-for-all seating for the two-row table overview.
 *
 * Seats sit around the table in turn order, which proceeds to the left (CR 101.4), so attack-left /
 * attack-right (CR 803.1) points at the board actually beside you. `clockwise` lists the living seats
 * starting at the anchor (you) and walking left, i.e. in turn order. Both returned rows are listed
 * left-to-right.
 *
 * Upstream parks the anchor in the bottom-right corner. When the bottom row holds an odd number of
 * seats (three or more — 6 and 7 players) the anchor takes the bottom centre instead: the next seats in
 * turn order sit to its left and the previous ones to its right, and the top row fills the gap between,
 * still reading left-to-right. Even bottom rows have no centre, so they keep the upstream corner.
 */
export interface FreeForAllRows<T> {
  bottom: T[]
  top: T[]
}

export function freeForAllRows<T>(clockwise: readonly T[]): FreeForAllRows<T> {
  const count = clockwise.length
  // The top row takes the odd seat, so the bottom (your interactive board) is never more crowded.
  const bottomCount = Math.max(1, Math.floor(count / 2))

  if (bottomCount >= 3 && bottomCount % 2 === 1) {
    const side = (bottomCount - 1) / 2
    const left = clockwise.slice(1, 1 + side) // turn order after the anchor, nearest first
    const right = clockwise.slice(count - side) // the seats just before the anchor, in turn order
    return {
      // Left end … nearest-left, anchor, nearest-right … right end.
      bottom: [...left.reverse(), clockwise[0] as T, ...right.reverse()],
      top: clockwise.slice(1 + side, count - side),
    }
  }

  return {
    bottom: clockwise.slice(0, bottomCount).reverse(),
    top: clockwise.slice(bottomCount),
  }
}
