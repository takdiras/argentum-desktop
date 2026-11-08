/**
 * The power/toughness badge under the arena layout.
 *
 * Two fixes to how upstream draws it on a small tile:
 *  - Its text is smaller than the badge's own font size, so the line box was sized by the parent's
 *    larger strut and put extra space above the digits. Setting the badge's font size and a unit
 *    line-height makes the padding equal on every side.
 *  - It is centred on the tile's bottom edge, hanging half off it, in the manner of a card's P/T
 *    box. `arenaPtHang` is how far that is.
 */
import type { CSSProperties } from 'react'

/** Vertical padding on each side, in px (the border adds 1 px more). */
const PT_VPAD = 3

/** Height of the badge for a given text size: line box (1 x font size) + padding + border. */
export const arenaPtBadgeHeight = (fontSize: number): number => fontSize + PT_VPAD * 2 + 2

/** Distance to push the badge down so its vertical centre sits on the tile's bottom edge. */
export const arenaPtHang = (fontSize: number): number => Math.round(arenaPtBadgeHeight(fontSize) / 2)

/** Extra styles for the badge element, on top of upstream's. */
export function arenaPtBadgeStyle(fontSize: number): CSSProperties {
  return {
    fontSize,
    lineHeight: 1,
    padding: `${PT_VPAD}px 7px`,
    display: 'inline-flex',
    alignItems: 'center',
  }
}
