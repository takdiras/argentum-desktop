import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { isScrolledToBottom } from './arenaStackScroll'

/**
 * Keeps the stack panel scrolled to its bottom, where the top of the stack sits.
 *
 * It jumps to the bottom whenever `key` changes (a spell was cast or one resolved), and follows the
 * content's growth while the panel is at the bottom (card art loading in changes the height) — but a
 * player who scrolled up to read an older item is left where they are until the stack changes again.
 *
 * Call it before any early return; the returned ref goes on the scrolling element, which may mount
 * later than the hook runs (it is read inside effects only).
 */
export function useStackScrollToBottom(key: string, enabled: boolean): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null)
  const pinned = useRef(true)

  useLayoutEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    pinned.current = true
    el.scrollTop = el.scrollHeight
  }, [key, enabled])

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const onScroll = () => {
      pinned.current = isScrolledToBottom(el.scrollTop, el.clientHeight, el.scrollHeight)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    // The panel itself resizes with the window and its content grows as images arrive.
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          if (pinned.current) el.scrollTop = el.scrollHeight
        })
    observer?.observe(el)
    for (const child of Array.from(el.children)) observer?.observe(child)
    return () => {
      el.removeEventListener('scroll', onScroll)
      observer?.disconnect()
    }
  }, [key, enabled])

  return ref
}
