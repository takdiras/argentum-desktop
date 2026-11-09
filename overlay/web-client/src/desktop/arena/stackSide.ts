/**
 * Which edge of the window the stack panel hugs, and the numbers that follow from it. Plain data in,
 * plain data out; `StackZone` (patch 0021) applies them.
 *
 * Card flights need nothing from here: `PlayAnimations` reads the stack item's on-screen rect every frame,
 * so a flight to or from the stack lands wherever the panel is drawn.
 */
import type { CSSProperties } from 'react'

export type StackSide = 'left' | 'right'

export const DEFAULT_STACK_SIDE: StackSide = 'left'

/** The yield menu's width (`YieldContextMenu` is a fixed 264px). */
export const YIELD_MENU_WIDTH = 264

/** Gap between a button and the menu it opens. */
const MENU_GAP = 8

/**
 * Distance from the chosen window edge. A phone sits close to it; a narrow (tablet) window keeps clear of
 * the life orb there, and a wide one clears the orb and its name. Same numbers upstream uses on the left,
 * mirrored for the right, so each side clears the same HUD furniture.
 */
export function stackEdgeInset(r: { isMobile: boolean; viewportWidth: number }): number {
  if (r.isMobile) return 12
  return r.viewportWidth < 1200 ? 16 : 120
}

/** The `left` or `right` style that pins the panel to its edge. */
export function stackAnchorStyle(side: StackSide, r: { isMobile: boolean; viewportWidth: number }): Pick<CSSProperties, 'left' | 'right'> {
  const inset = stackEdgeInset(r)
  return side === 'right' ? { right: inset } : { left: inset }
}

/**
 * Where the yield menu's left edge goes when opened from a button on the panel: beside the button, on the
 * side facing the rest of the table (right of it for a left stack, left of it for a right stack, so the menu
 * never covers the panel it belongs to).
 */
export function yieldMenuX(side: StackSide, button: { left: number; right: number }, menuWidth: number = YIELD_MENU_WIDTH): number {
  return side === 'right' ? button.left - MENU_GAP - menuWidth : button.right + MENU_GAP
}

export function parseStackSide(raw: string | null): StackSide {
  return raw === 'right' ? 'right' : DEFAULT_STACK_SIDE
}
