/**
 * Keeps the stack on top of the combat arrow layer. The layer is one full-window SVG above everything,
 * so an arrow or a BLOCKED tag crossing the stack painted over it; here that SVG's contents are masked with
 * a hole where the stack panel is. Arena layout only — classic keeps upstream's layering.
 */
import { useEffect, useState } from 'react'
import { useArenaLayout } from './arenaLayoutStore'
import { STACK_MASK_ID, cutoutRect, sameCutout, type Cutout } from './stackCutout'

/** Where the stack panel is, kept current (checked a few times a second, and only re-renders on a change). */
export function useStackCutout(): Cutout | null {
  const arena = useArenaLayout()
  const [cutout, setCutout] = useState<Cutout | null>(null)

  useEffect(() => {
    if (!arena) {
      setCutout(null)
      return
    }
    const read = () => {
      const next = cutoutRect(document.querySelector('[data-learn="stack"]')?.getBoundingClientRect() ?? null)
      setCutout((prev) => (sameCutout(prev, next) ? prev : next))
    }
    read()
    const id = window.setInterval(read, 100)
    return () => window.clearInterval(id)
  }, [arena])

  return cutout
}

/** The mask itself: everything shows except the hole. Render inside the `<svg>`. */
export function StackCutoutDefs({ cutout }: { cutout: Cutout | null }) {
  if (!cutout) return null
  return (
    <defs>
      <mask id={STACK_MASK_ID} maskUnits="userSpaceOnUse" x={0} y={0} width="100%" height="100%">
        <rect x={0} y={0} width="100%" height="100%" fill="white" />
        <rect x={cutout.x} y={cutout.y} width={cutout.width} height={cutout.height} rx={14} fill="black" />
      </mask>
    </defs>
  )
}

/** The `mask` attribute value for the group wrapping the layer's contents. */
export const stackCutoutMask = (cutout: Cutout | null): string | undefined => (cutout ? `url(#${STACK_MASK_ID})` : undefined)
