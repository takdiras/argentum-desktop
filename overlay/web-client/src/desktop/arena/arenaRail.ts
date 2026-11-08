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
`
