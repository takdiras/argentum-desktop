/**
 * The priority frame: a thin ring around the battlefield of whichever seat holds priority, in that
 * seat's colour, so the eye can tell where the game is waiting without reading a plate.
 *
 * It is the battlefield-sized sibling of the plate's turn ring (2px, `seat.base`, see patch 0022):
 * the same colour language, slightly thinner so the turn ring stays the louder of the two.
 */

/** Width of the plate's turn ring (patch 0022), kept here so the frame can be defined against it. */
export const TURN_RING_WIDTH = 2

/** The priority frame is a touch thinner than the turn ring. */
export const PRIORITY_FRAME_WIDTH = 1.5

/** Corner radius, matching the playmat it frames. */
export const PRIORITY_FRAME_RADIUS = 18

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
