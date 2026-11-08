import { useMemo } from 'react'
import { useGameStore } from '@/store/gameStore.ts'

/**
 * Ids of your own cards that are still flying in from the library. Their slot in the hand is laid out but
 * left empty until the card lands and turns over, so the hand never shows a card that has not arrived yet.
 */
export function usePendingDrawIds(): ReadonlySet<string> {
  const animations = useGameStore((s) => s.drawAnimations)
  return useMemo(() => {
    const ids = new Set<string>()
    for (const a of animations) if (!a.isOpponent && a.cardId) ids.add(a.cardId)
    return ids
  }, [animations])
}
