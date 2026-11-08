/**
 * Drag-to-reorder for your own hand's fan.
 *
 * A press on a hand card that moves sideways (more than it moves up or down) rearranges the hand; one that
 * moves up is still upstream's drag-to-cast, and a press that barely moves is still a click. The reorder is
 * live — the other cards slide aside as the dragged one passes them — and is saved when the pointer is
 * released.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { useGameStore } from '@/store/gameStore.ts'
import { HAND_DRAG_THRESHOLD, dropIndex, moveId, orderHand } from './handOrder'
import { useHandOrderStore } from './handOrderStore'

interface Drag {
  id: string
  /** Pointer x, from the fan's left edge. */
  x: number
}

export interface HandReorder<T extends { id: string }> {
  /** The cards to draw, left to right: your saved order, with a card being dragged already in its new slot. */
  cards: T[]
  containerRef: RefObject<HTMLDivElement | null>
  /** The card being dragged, and where its left edge should be (it follows the pointer, not a slot). */
  draggingId: string | null
  dragLeft: number | null
  onPointerDown: (id: string) => (e: ReactPointerEvent) => void
  /** Capture-phase click handler for a card: swallows the click a finished drag would otherwise deliver. */
  onClickCapture: (e: ReactMouseEvent) => void
}

export function useHandReorder<T extends { id: string }>(
  cards: readonly T[],
  opts: { enabled: boolean; spacing: number; width: number },
): HandReorder<T> {
  const { enabled, spacing, width } = opts
  const order = useHandOrderStore((s) => s.order)
  const setOrder = useHandOrderStore((s) => s.setOrder)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const swallowClick = useRef(false)
  const cleanup = useRef<(() => void) | null>(null)

  const saved = useMemo(() => (enabled ? orderHand(cards, order) : [...cards]), [cards, order, enabled])

  const target = drag ? dropIndex(drag.x, spacing, width, saved.length) : null
  const shown = useMemo(() => {
    if (!drag || target === null) return saved
    const byId = new Map(saved.map((c) => [c.id, c]))
    return moveId(saved.map((c) => c.id), drag.id, target).flatMap((id) => {
      const card = byId.get(id)
      return card ? [card] : []
    })
  }, [saved, drag, target])

  // The latest of these, for the window listeners that outlive a render.
  const latest = useRef({ shown, spacing, width })
  latest.current = { shown, spacing, width }

  useEffect(() => () => cleanup.current?.(), [])

  // The browser starts selecting the card art on a press; no hand card is ever meant to be selected.
  useEffect(() => {
    const node = containerRef.current
    if (!enabled || !node) return
    const block = (e: Event) => e.preventDefault()
    node.addEventListener('selectstart', block)
    return () => node.removeEventListener('selectstart', block)
  }, [enabled])

  const onPointerDown = useCallback(
    (id: string) => (e: ReactPointerEvent) => {
      if (!enabled || e.button !== 0) return
      const startX = e.clientX
      const startY = e.clientY
      let active = false

      const bodyStyle = document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }
      const prevSelect = { std: bodyStyle.userSelect, webkit: bodyStyle.webkitUserSelect }
      const stop = () => {
        // Selecting is allowed again everywhere once the gesture is over.
        bodyStyle.userSelect = prevSelect.std
        bodyStyle.webkitUserSelect = prevSelect.webkit
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        cleanup.current = null
      }
      const move = (ev: PointerEvent) => {
        const box = containerRef.current?.getBoundingClientRect()
        if (!box) return
        if (!active) {
          const dx = Math.abs(ev.clientX - startX)
          const dy = Math.abs(ev.clientY - startY)
          if (Math.max(dx, dy) < HAND_DRAG_THRESHOLD) return
          // Moving up is dragging the card out to cast it: not ours.
          if (dy > dx) return stop()
          active = true
          // Nothing under the pointer may be selected while a card is dragged across the page (WebKit, which
          // the desktop shell uses on macOS, needs the prefixed property), and clear any selection that began
          // on the press before this became a drag.
          bodyStyle.userSelect = 'none'
          bodyStyle.webkitUserSelect = 'none'
          window.getSelection()?.removeAllRanges()
          // The card was also picked up for casting; this gesture is a reorder instead.
          useGameStore.getState().stopDraggingCard()
        }
        setDrag({ id, x: ev.clientX - box.left })
      }
      const up = () => {
        stop()
        if (!active) return
        swallowClick.current = true
        window.setTimeout(() => (swallowClick.current = false), 50)
        setOrder(latest.current.shown.map((c) => c.id))
        setDrag(null)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
      cleanup.current = stop
    },
    [enabled, setOrder],
  )

  const onClickCapture = useCallback((e: ReactMouseEvent) => {
    if (swallowClick.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }, [])

  const maxLeft = Math.max(0, (saved.length - 1) * spacing)
  const dragLeft = drag ? Math.max(0, Math.min(maxLeft, drag.x - width / 2)) : null

  return { cards: shown, containerRef, draggingId: drag?.id ?? null, dragLeft, onPointerDown, onClickCapture }
}
