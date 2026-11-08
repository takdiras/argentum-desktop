/**
 * The combat arrows (and the BLOCKED tag) live on one full-window layer far above the board. Under the
 * arena layout the stack must stay on top of them, so that layer is masked with a hole where the stack
 * panel is. Plain data in, plain data out.
 */

export const STACK_MASK_ID = 'argentum-stack-cutout'

/** The part of the layer to hide, in window pixels. */
export interface Cutout {
  x: number
  y: number
  width: number
  height: number
}

/** The hole for a panel at `rect`, grown by `pad` so nothing touches the panel's edge. Null with no panel. */
export function cutoutRect(
  rect: { left: number; top: number; width: number; height: number } | null,
  pad = 4,
): Cutout | null {
  if (!rect || rect.width <= 0 || rect.height <= 0) return null
  return {
    x: Math.round(rect.left - pad),
    y: Math.round(rect.top - pad),
    width: Math.round(rect.width + 2 * pad),
    height: Math.round(rect.height + 2 * pad),
  }
}

export function sameCutout(a: Cutout | null, b: Cutout | null): boolean {
  if (a === null || b === null) return a === b
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}
