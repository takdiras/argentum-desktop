/**
 * The flight of a card you played, from where it was to where it now sits on the battlefield.
 * Plain data in, plain data out, so it is unit-testable.
 */

/** One flight, hand (or stack) to its place on the field. */
export const PLAY_FLIGHT_MS = 420
/** One flight to the stack: quicker, as spells and abilities come in rapid succession and each waits on the last. */
export const STACK_FLIGHT_MS = 240
/** Share of the flight after which the real card is shown and the flying copy fades out over it. */
export const PLAY_REVEAL_AT = 0.75
/** A card you let go of this recently was the one you dragged out to play. */
export const DROP_MEMORY_MS = 4000
/** How long to wait for the card to show up on the field before giving up on its flight. */
export const PLAY_TARGET_WAIT_MS = 700

/** A card as laid out on screen: its centre, its size, and how far it is turned (degrees). */
export interface Box {
  cx: number
  cy: number
  w: number
  h: number
  rotation: number
}

/** The ghost under the cursor while you drag (80 x 112, drawn at 1.1x and turned -5 degrees). */
export const DRAGGED_CARD_SIZE = { w: 88, h: 123, rotation: -5 } as const

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t))
const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export interface PlayProgress {
  /** 0 at the start, 1 at the field (eased). */
  t: number
  /** From here on the real card is visible. */
  reveal: boolean
  /** Opacity of the flying copy: solid, then fading out over the real card. */
  opacity: number
  done: boolean
}

export function playProgress(elapsedMs: number, durationMs: number = PLAY_FLIGHT_MS): PlayProgress {
  const linear = clamp01(elapsedMs / durationMs)
  return {
    t: easeInOutCubic(linear),
    reveal: linear >= PLAY_REVEAL_AT,
    opacity: linear < PLAY_REVEAL_AT ? 1 : 1 - (linear - PLAY_REVEAL_AT) / (1 - PLAY_REVEAL_AT),
    done: linear >= 1,
  }
}

export const lerpBox = (a: Box, b: Box, t: number): Box => ({
  cx: lerp(a.cx, b.cx, t),
  cy: lerp(a.cy, b.cy, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  rotation: lerp(a.rotation, b.rotation, t),
})

/** Ids in `next` that were not in `prev`, in `next`'s order. */
export function enteredIds(prev: ReadonlySet<string>, next: Iterable<string>): string[] {
  const out: string[] = []
  for (const id of next) if (!prev.has(id)) out.push(id)
  return out
}

export interface Drop {
  cardId: string
  x: number
  y: number
  at: number
}

/** Where a card starts its flight, best source first: where you dropped it, its slot in your hand, any other place it was drawn. */
export function pickOrigin(
  cardId: string,
  now: number,
  sources: { drop: Drop | null; hand: Box | null; elsewhere: Box | null },
): Box | null {
  const { drop } = sources
  if (drop && drop.cardId === cardId && now - drop.at <= DROP_MEMORY_MS) {
    return { cx: drop.x, cy: drop.y, ...DRAGGED_CARD_SIZE }
  }
  return sources.hand ?? sources.elsewhere
}

/** A drag shorter than this is a click, not a play (kept in step with GameCard's own threshold). */
export const MIN_PLAY_DRAG_PX = 30
/** The most a let-go card is held in place while waiting for the table to show it was played. */
export const HOLD_MAX_MS = 2000

/**
 * Whether letting go of a dragged hand card was an attempt to play it, as GameCard reads it: dragged far
 * enough, and released above the top of the hand (`handTop`, null when there is no hand to measure).
 */
export function isPlayDrop(from: { x: number; y: number }, to: { x: number; y: number }, handTop: number | null): boolean {
  if (Math.hypot(to.x - from.x, to.y - from.y) < MIN_PLAY_DRAG_PX) return false
  return handTop === null || to.y < handTop
}

export interface SourceCandidate {
  id: string
  name: string
  controllerId: string
}

/** Whether a stack item is an ability (activated or triggered) rather than a spell. The type line is read too, as the stack panel does. */
export function isStackAbility(card: { cardTypes: readonly string[]; typeLine?: string | undefined }): boolean {
  return card.cardTypes.includes('Ability') || card.typeLine === 'Ability' || card.typeLine === 'Triggered Ability'
}

/**
 * The permanent an ability on the stack came from. The stack item carries the source's name and
 * controller but not its id, so: same name and controller (or, failing that, a name that begins with the
 * other's, in case the server decorates an ability's name), and when several match (a row of identical
 * creatures) the one that just tapped, which is how an activation with {T} in its cost gives it away.
 */
export function pickAbilitySource(
  candidates: readonly SourceCandidate[],
  name: string,
  controllerId: string,
  justTapped: ReadonlySet<string>,
): string | null {
  const mine = candidates.filter((c) => c.controllerId === controllerId)
  const exact = mine.filter((c) => c.name === name)
  // Longest source name first, so "Elves of Deep Shadow" beats "Elves" for "Elves of Deep Shadow ability".
  const loose = mine
    .filter((c) => c.name !== name && (name.startsWith(c.name) || c.name.startsWith(name)))
    .sort((x, y) => y.name.length - x.name.length)
  const matches = exact.length > 0 ? exact : loose.filter((c) => c.name === loose[0]?.name)
  return (matches.find((c) => justTapped.has(c.id)) ?? matches[0])?.id ?? null
}
