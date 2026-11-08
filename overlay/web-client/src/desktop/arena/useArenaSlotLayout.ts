/**
 * Measures a battlefield's slot and solves the arena card sizes for what is on that board.
 * Returns the `ResponsiveSizes` to provide for the creature block and for the land/other band
 * (so every card, badge and attachment stack inside scales together), and the wrap-line budget.
 */
import { useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { sizesForCardWidth, useResponsiveContext } from '@/components/game/board/shared'
import type { GroupedCard } from '@/store/selectors.ts'
import type { BoardStats } from '@/components/game/board/battlefieldLayout'
import type { ResponsiveSizes } from '@/hooks/useResponsive'
import {
  ARENA_ZONE_PAD_TOP,
  ARENA_ZONE_PAD_X,
  arenaCardHeight,
  arenaMaxCardWidth,
  solveArenaLayout,
  type ArenaCounts,
} from './arenaMetrics'

export interface ArenaSlotLayout {
  sizes: ResponsiveSizes
  backSizes: ResponsiveSizes
  frontLines: number
  backLines: number
}

/** Used until the slot has been measured, so the first frame isn't classic-sized. */
const FALLBACK_SLOT = { width: 1000, height: 600 }

export function useArenaSlotLayout(
  slotRef: RefObject<HTMLElement | null>,
  groups: {
    lands: readonly GroupedCard[]
    other: readonly GroupedCard[]
    creatures: readonly GroupedCard[]
    planeswalkers: readonly GroupedCard[]
  },
  stats: BoardStats,
): ArenaSlotLayout {
  const base = useResponsiveContext()
  const [slot, setSlot] = useState<{ width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const node = slotRef.current
    if (!node) return
    // Whole pixels, and no state change for a same-size report, so sub-pixel wobble of the grid
    // rows can't re-solve on every frame.
    const update = (width: number, height: number) =>
      setSlot((prev) => {
        const next = { width: Math.round(width), height: Math.round(height) }
        return prev !== null && prev.width === next.width && prev.height === next.height ? prev : next
      })
    const rect = node.getBoundingClientRect()
    update(rect.width, rect.height)
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) update(entry.contentRect.width, entry.contentRect.height)
    })
    obs.observe(node)
    return () => obs.disconnect()
  }, [slotRef])

  const { lands, other, creatures, planeswalkers } = groups
  const frontExtra = stats.front.stackedExtra
  const backExtra = stats.back.stackedExtra
  // Tapped stacks take the tilted footprint, which is bigger than an upright tile's.
  const tappedIn = (list: readonly GroupedCard[]): number => list.reduce((n, g) => n + (g.card.isTapped ? 1 : 0), 0)
  const frontTapped = tappedIn(creatures) + tappedIn(planeswalkers)
  const landsTapped = tappedIn(lands)
  const otherTapped = tappedIn(other)
  const frontCount = creatures.length + planeswalkers.length
  const landCount = lands.length
  const otherCount = other.length
  const backTotal = Math.max(1, landCount + otherCount)

  return useMemo(() => {
    const counts: ArenaCounts = {
      front: { count: frontCount, stackedExtra: frontExtra, tapped: frontTapped },
      lands: { count: landCount, stackedExtra: Math.round((backExtra * landCount) / backTotal), tapped: landsTapped },
      other: { count: otherCount, stackedExtra: Math.round((backExtra * otherCount) / backTotal), tapped: otherTapped },
    }
    const { width, height } = slot !== null && slot.width > 0 && slot.height > 0 ? slot : FALLBACK_SLOT
    // The zones keep a little headroom (see ARENA_ZONE_PAD_*), so tiles are fitted to what is left.
    const solved = solveArenaLayout(Math.max(1, width - 2 * ARENA_ZONE_PAD_X), Math.max(1, height - ARENA_ZONE_PAD_TOP), counts, {
      gap: base.cardGap,
      maxWidth: arenaMaxCardWidth(base.viewportHeight),
    })
    // The shared helper derives badge/font scale from the card width; the card is shorter than a
    // full card, so its height (used by attachment stacks) is overridden.
    const sized = (w: number): ResponsiveSizes => ({ ...sizesForCardWidth(base, w), battlefieldCardHeight: arenaCardHeight(w) })
    return {
      sizes: sized(solved.cardWidth),
      backSizes: sized(solved.backWidth),
      frontLines: solved.frontLines,
      backLines: solved.backLines,
    }
  }, [slot, base, frontCount, frontExtra, frontTapped, landCount, landsTapped, otherCount, otherTapped, backExtra, backTotal])
}
