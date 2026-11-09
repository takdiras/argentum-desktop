/**
 * The ring around a player's area (their command zone, battlefield and piles, and in a pod their name plate):
 * which seat shows one, and how thick it is.
 *
 *   - The seat whose **turn** it is wears the turn ring: thick, in the seat's colour.
 *   - A seat that holds **priority** on someone else's turn wears the priority ring: the same colour, thin.
 *   - On its own turn a seat never gets a second, priority ring: the turn ring already marks it, so it
 *     is drawn thicker than the priority ring instead of the two stacking.
 */

/** The turn ring (area and name plate): clearly thicker than the priority ring. */
export const TURN_RING_WIDTH = 3

/** The priority ring is thin, so it reads as secondary to the turn ring. */
export const PRIORITY_FRAME_WIDTH = 1.5

/** The ring sits this far inside the area's edge, and the playmat fills the same box. */
export const AREA_RING_INSET = 2

/** Corner radius of the ring and the playmat. */
export const AREA_RING_RADIUS = 10

export type AreaRing = 'turn' | 'priority' | 'none'

/**
 * Whether this board's owner currently holds priority. A seat that has lost never does, and nobody
 * does while the game is between priority windows (`priorityPlayerId` unset).
 */
export function holdsPriority(
  ownerId: string | null | undefined,
  priorityPlayerId: string | null | undefined,
  ownerHasLost: boolean,
): boolean {
  return ownerId != null && priorityPlayerId != null && ownerId === priorityPlayerId && !ownerHasLost
}

/**
 * Which ring an area shows. `turn` is true when this area carries a turn ring at all (its seat is the
 * active player, at a table that draws one); that ring wins over priority.
 */
export function areaRing(turn: boolean, priority: boolean): AreaRing {
  if (turn) return 'turn'
  return priority ? 'priority' : 'none'
}

export function areaRingWidth(ring: AreaRing): number {
  return ring === 'turn' ? TURN_RING_WIDTH : PRIORITY_FRAME_WIDTH
}
