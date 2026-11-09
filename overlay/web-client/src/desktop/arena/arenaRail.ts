/**
 * The multiplayer seat rail as a row along the top of the window.
 *
 * Upstream draws it as a column down the left edge and makes the whole board give up that column's
 * width (`railReservedWidth`). Under the arena layout it runs horizontally between the corner
 * controls, so the board gets its full width back; the only thing it costs is a strip at the top that
 * the board already keeps clear for the Fullscreen / Concede buttons.
 *
 * Team games keep their grouped column (each team is a stacked section), and phones keep the compact
 * column, since a row of chips has no room on a portrait screen.
 */

/** Distance from the top of the window, in line with the corner buttons. */
export const RAIL_ROW_TOP = 8

/** Clear of the Fullscreen / settings / chat buttons on the left... */
export const RAIL_ROW_INSET_LEFT = 168

/** ...and the Concede / action buttons on the right. */
export const RAIL_ROW_INSET_RIGHT = 170

/** Viewports where the rail uses its compact (nameless) chips. Mirrors upstream's `railCompact`. */
export function railViewportIsCompact(r: { isMobile: boolean; viewportHeight: number }): boolean {
  return r.isMobile || r.viewportHeight < 560
}

/** Width the Overview / Follow toggles (and the help tip) take at the end of a row rail. */
export const RAIL_ROW_TOGGLES_WIDTH = 190

/** The least a chip needs to show a readable name; below it the row switches to initials. */
export const RAIL_CHIP_NAMED_MIN_WIDTH = 180

/**
 * Whether a row rail with this many seats is too crowded to print names: each chip's share of the room
 * between the corner buttons (minus the toggles) is below [RAIL_CHIP_NAMED_MIN_WIDTH]. The chips then
 * show initials and open to the full name on hover, which keeps the row inside its lane instead of
 * running under the Concede button. Few seats on a wide window keep their names.
 */
export function railChipsCondensed(seatCount: number, viewportWidth: number): boolean {
  if (seatCount <= 0) return false
  const lane = viewportWidth - RAIL_ROW_INSET_LEFT - RAIL_ROW_INSET_RIGHT - RAIL_ROW_TOGGLES_WIDTH
  return lane / seatCount < RAIL_CHIP_NAMED_MIN_WIDTH
}

/**
 * Up to two letters standing in for a seat name. A leading bracketed tag ("[AI] ") is dropped; two or
 * more words give their first letters ("Cruel Optimus" -> "CO"), one word gives its first two
 * characters ("kabutakoo" -> "KA").
 */
export function railInitials(name: string): string {
  const words = name
    .replace(/^\s*\[[^\]]*\]\s*/, '')
    .split(/[\s\-_.]+/)
    .map((w) => Array.from(w).filter((c) => /[\p{L}\p{N}]/u.test(c)))
    .filter((chars) => chars.length > 0)
  const first = words[0]
  if (!first) return '?'
  const letters = words.length > 1 ? [first[0]!, words[1]![0]!] : first.slice(0, 2)
  return letters.join('').toUpperCase()
}

/** Whether the rail should run as a row. */
export function railIsHorizontal(arena: boolean, teamGame: boolean, compactViewport: boolean): boolean {
  return arena && !teamGame && !compactViewport
}

/**
 * CSS for the chips inside a horizontal rail, keyed on `[data-rail-horizontal]`. Chips share the row
 * evenly up to their normal width and shrink (names truncate) when the table is large; the camera
 * toggles, last in the row, keep their own width.
 */
export const RAIL_ROW_CSS = `
[data-rail-horizontal] > div {
  flex: 1 1 0;
  min-width: 0;
  max-width: var(--rail-chip-max, 232px);
}
[data-rail-horizontal] > div:last-child {
  flex: 0 0 auto;
  max-width: none;
  margin-top: 0 !important;
  margin-left: 6px;
}

/* Initials stand in for the name only when the row is condensed (see railChipsCondensed). */
[data-rail-initials] { display: none; }

/*
 * Condensed row: each chip is a fixed slot showing portrait, initials, life and hand. Hovering a slot
 * opens its chip to the full name (and the 1-9 key badge) over its neighbours, animating the name's
 * width; the chip sits on a solid background while open so the seats beneath don't bleed through.
 */
[data-rail-condensed] > div:not(:last-child) { transition: z-index 0s 0.2s; }
[data-rail-condensed] > div:not(:last-child):hover { z-index: 10; transition-delay: 0s; }
[data-rail-condensed] > div:not(:last-child) > div:first-child {
  width: max-content !important;
  min-width: 100%;
  padding-left: 6px !important;
  padding-right: 6px !important;
  gap: 3px !important;
}
[data-rail-condensed] > div:not(:last-child):hover > div:first-child {
  background-color: #0a0c14 !important;
}
[data-rail-condensed] [data-rail-name] {
  flex: 0 1 auto !important;
  gap: 0 !important;
}
[data-rail-condensed] [data-rail-initials],
[data-rail-condensed] [data-rail-full] {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  transition: max-width 240ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 180ms ease;
}
[data-rail-condensed] [data-rail-initials] { max-width: 3ch; opacity: 1; }
[data-rail-condensed] [data-rail-full] { max-width: 0; opacity: 0; }
[data-rail-condensed] > div:not(:last-child):hover [data-rail-initials] { max-width: 0; opacity: 0; }
[data-rail-condensed] > div:not(:last-child):hover [data-rail-full] { max-width: 190px; opacity: 1; }
/* Extras that only earn their width once the chip is open; the turn ring already marks whose turn it is. */
[data-rail-condensed] [data-rail-tag],
[data-rail-condensed] [data-rail-turn],
[data-rail-condensed] [data-rail-hand-icon],
[data-rail-condensed] kbd { display: none !important; }
[data-rail-condensed] > div:not(:last-child):hover [data-rail-tag] { display: inline !important; margin-left: 5px; }
[data-rail-condensed] > div:not(:last-child):hover [data-rail-turn],
[data-rail-condensed] > div:not(:last-child):hover [data-rail-hand-icon] { display: inline-block !important; }
[data-rail-condensed] > div:not(:last-child):hover kbd { display: inline-flex !important; }
`

/**
 * Whether Overview / Follow sit in the top-right corner, beside Concede, instead of at the end of the
 * seat row. They are settings, not seats, and the corner is where the other window controls live.
 * Only for a player at a row-rail table: a spectator has no Concede button to sit beside, so keeps them
 * in the rail.
 */
export function cameraControlsInCorner(a: { rowRail: boolean; multiplayer: boolean; spectating: boolean }): boolean {
  return a.rowRail && a.multiplayer && !a.spectating
}

/**
 * Whether the seat row can be dropped altogether: with Overview on, every living opponent's board is
 * on screen with its own name plate, and the plate carries everything a seat chip would (name, life,
 * hand, speed, counters, whose turn it is). The row is only needed while a board is *not* on screen,
 * because clicking its chip is how you bring that board in (focused camera, a collapsed cell, the
 * combat defender split), or while a seat has no plate (the center orb stands in for one, and on a
 * table without a bottom row your own seat is the orb): `platesOnEverySeat` says every seat has one.
 */
export function railRowHidden(a: {
  inCorner: boolean
  multiView: boolean
  platesOnEverySeat: boolean
  livingOpponentIds: readonly string[]
  visibleIds: readonly string[]
}): boolean {
  if (!a.inCorner || !a.multiView || !a.platesOnEverySeat) return false
  const visible = new Set(a.visibleIds)
  return a.livingOpponentIds.every((id) => visible.has(id))
}

/** Default maximum hand size (CR 402.2): no "/max" suffix is shown while it is unchanged. */
const DEFAULT_MAX_HAND_SIZE = 7

/** "/∞" for no maximum (Reliquary Tower), "/N" for a finite cap, nothing at the normal 7. */
export function handLimitSuffix(maxHandSize?: number | null): string {
  if (maxHandSize === undefined || maxHandSize === DEFAULT_MAX_HAND_SIZE) return ''
  return maxHandSize === null ? '/∞' : `/${maxHandSize}`
}

export interface PlateRect {
  left: number
  right: number
  top: number
  bottom: number
}

/** Height of the corner controls' band (Fullscreen / settings on the left, Concede on the right). */
export const CORNER_BAND_BOTTOM = 48

/**
 * How far down a name plate must move to clear the corner controls it overlaps, in px (0 when it
 * overlaps none). With the seat row gone the strip along the top is shortened, so the plate of a
 * corner board can end up under Concede / Overview / Follow (or the Fullscreen buttons); only that
 * plate steps down, by just enough, and the rest of the row keeps the gained height.
 */
export function plateDodge(plate: PlateRect, zones: readonly PlateRect[], gap = 6): number {
  let need = 0
  for (const z of zones) {
    const overlapsX = plate.left < z.right + gap && plate.right > z.left - gap
    const overlapsY = plate.top < z.bottom + gap && plate.bottom > z.top
    if (overlapsX && overlapsY) need = Math.max(need, z.bottom + gap - plate.top)
  }
  return Math.max(0, need)
}
