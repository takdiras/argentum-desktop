/**
 * Which cards changed zone between two game states, and how their flights are timed. Plain data in,
 * plain data out, so it is unit-testable; the DOM side lives in `PlayAnimations`.
 */

/** Where a card is. Shared zones (the battlefield, the stack) have no owner. */
export interface Loc {
  zone: string
  owner: string | null
}

export interface ZoneLike {
  zoneId: { zoneType: string; ownerId?: string | null | undefined }
  cardIds: readonly string[]
}

/** Zones that belong to everyone: a card moving between two players' battlefield zones didn't move. */
const SHARED_ZONES = new Set(['Battlefield', 'Stack'])

export function locate(zones: readonly ZoneLike[]): Map<string, Loc> {
  const out = new Map<string, Loc>()
  for (const z of zones) {
    const owner = SHARED_ZONES.has(z.zoneId.zoneType) ? null : (z.zoneId.ownerId ?? null)
    for (const id of z.cardIds) out.set(id, { zone: z.zoneId.zoneType, owner })
  }
  return out
}

export interface Move {
  id: string
  from: Loc
  to: Loc
}

/** Cards that were somewhere before and are somewhere else now, in `next`'s order. */
export function moves(prev: ReadonlyMap<string, Loc>, next: ReadonlyMap<string, Loc>): Move[] {
  const out: Move[] = []
  for (const [id, to] of next) {
    const from = prev.get(id)
    if (from && (from.zone !== to.zone || from.owner !== to.owner)) out.push({ id, from, to })
  }
  return out
}

/** Zones with nothing on screen to fly from or to. */
const UNSEEN_ZONES = new Set(['Command', 'Ante', 'Sideboard'])

/**
 * Whether a move gets a flight of its own. Not a draw (library to hand: `DrawAnimations` does that), not a
 * mulligan shuffling a hand back, and not a zone with no place on the table.
 */
export function animates(m: Move): boolean {
  if (UNSEEN_ZONES.has(m.from.zone) || UNSEEN_ZONES.has(m.to.zone)) return false
  if (m.from.zone === 'Library' && m.to.zone === 'Hand') return false
  if (m.from.zone === 'Hand' && m.to.zone === 'Library') return false
  return true
}

export type FlightKind = 'field' | 'stack' | 'hand' | 'pile'

/** Where a move ends up: a tile on a battlefield, a stack item, a hand slot, or a pile (graveyard, exile, library, their hand). */
export function kindFor(to: Loc, viewerId: string): FlightKind | null {
  switch (to.zone) {
    case 'Battlefield':
      return 'field'
    case 'Stack':
      return 'stack'
    case 'Hand':
      return to.owner === viewerId ? 'hand' : 'pile'
    case 'Graveyard':
    case 'Exile':
    case 'Library':
      return 'pile'
    default:
      return null
  }
}

/** One flight, by where it is headed. A battlefield tile is the slowest to settle, the stack the quickest. */
export const FLIGHT_MS: Record<FlightKind, number> = { field: 420, hand: 380, pile: 320, stack: 240 }

/** The most flights one update starts; the rest just happen. */
export const MAX_FLIGHTS_PER_UPDATE = 14

/** Gap between flights that start together, and the longest any waits behind the others. */
export const STAGGER_STEP_MS = 70
export const STAGGER_CAP_MS = 700

/**
 * When the next flight may start so that flights ripple one after another instead of leaving together.
 * `nextSlot` is the earliest free time (ms epoch); the flight takes it, never waiting more than the cap.
 */
export function scheduleStart(now: number, nextSlot: number): { startAt: number; nextSlot: number } {
  const startAt = Math.min(Math.max(now, nextSlot), now + STAGGER_CAP_MS)
  return { startAt, nextSlot: startAt + STAGGER_STEP_MS }
}
