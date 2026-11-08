/**
 * Your hand's order, which you can rearrange by dragging. Plain data in, plain data out: the server
 * has no say in the order of a hand, so this is a purely local preference (see `handOrderStore`).
 */

/** Cards in the saved order; cards the order doesn't know (just drawn) go on the right, in their own order. */
export function orderHand<T extends { id: string }>(cards: readonly T[], order: readonly string[]): T[] {
  const byId = new Map(cards.map((c) => [c.id, c]))
  const known: T[] = []
  for (const id of order) {
    const card = byId.get(id)
    if (card) {
      known.push(card)
      byId.delete(id)
    }
  }
  // Whatever is left was never placed: keep it in the hand's own order, after the placed ones.
  return [...known, ...cards.filter((c) => byId.has(c.id))]
}

/** `ids` with `id` moved to position `toIndex` (clamped). Unchanged when `id` isn't in the list. */
export function moveId(ids: readonly string[], id: string, toIndex: number): string[] {
  const from = ids.indexOf(id)
  if (from < 0) return [...ids]
  const rest = ids.filter((x) => x !== id)
  const to = Math.max(0, Math.min(rest.length, toIndex))
  return [...rest.slice(0, to), id, ...rest.slice(to)]
}

/**
 * The slot a dragged card would drop into. `pointerX` is measured from the fan's left edge; slots are
 * `spacing` apart and a card is `width` wide, so the card's centre sits `width / 2` in from its slot's left.
 */
export function dropIndex(pointerX: number, spacing: number, width: number, count: number): number {
  if (count <= 1 || spacing <= 0) return 0
  return Math.max(0, Math.min(count - 1, Math.round((pointerX - width / 2) / spacing)))
}

/** Pointer travel (px) before a press on a hand card becomes a reorder rather than a click. */
export const HAND_DRAG_THRESHOLD = 8
