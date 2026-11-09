/**
 * A faint playmat behind one player's battlefield: their commander's art, else their deck's marquee
 * card, else a wash of their colours (see `playmatArt.ts`). It sits at the back of the zone's own
 * stacking context and never takes a click, so cards, targeting and drops are unaffected.
 */
import { useMemo, useRef } from 'react'
import { useGameStore } from '@/store/gameStore.ts'
import {
  PLAYMAT_OPACITY,
  decodePlaymatArt,
  encodePlaymatArt,
  playmatArtFor,
  playmatWash,
  stickyPlaymatArt,
} from './playmatArt'
import { useBoardOwnerId } from './useBoardOwnerId'

/** The encoded art for this battlefield, or null before the game state arrives. */
function usePlaymatArt(isOpponent: boolean, playerId?: string | undefined): string | null {
  const ownerId = useBoardOwnerId(isOpponent, playerId)
  // A string, so the selector returns by value and the mat re-renders only when its art changes.
  const fresh = useGameStore((s) =>
    s.gameState && ownerId ? encodePlaymatArt(playmatArtFor(Object.values(s.gameState.cards), ownerId)) : null,
  )
  const kept = useRef<{ ownerId: string | null; art: string } | null>(null)
  if (fresh === null) return null
  kept.current = stickyPlaymatArt(fresh, ownerId, kept.current)
  return kept.current.art
}

export function Playmat({ isOpponent, playerId }: { isOpponent: boolean; playerId?: string | undefined }) {
  const encoded = usePlaymatArt(isOpponent, playerId)
  const art = useMemo(() => (encoded ? decodePlaymatArt(encoded) : null), [encoded])
  if (!art) return null

  const layer = art.kind === 'colors' ? [playmatWash(art.colors)] : art.kind === 'deck' ? [art.url] : art.urls

  return (
    <div
      aria-hidden
      data-playmat={art.kind}
      style={{
        position: 'absolute',
        inset: 0,
        // Behind the zone's in-flow cards, inside its own stacking context (the zone sets zIndex).
        zIndex: -1,
        pointerEvents: 'none',
        display: 'flex',
        borderRadius: 18,
        overflow: 'hidden',
        opacity: PLAYMAT_OPACITY,
        // Fade into the table at the edges rather than ending in a hard rectangle.
        maskImage: 'radial-gradient(ellipse at center, #000 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, #000 40%, transparent 100%)',
      }}
    >
      {layer.map((src, i) => (
        <div
          key={`${i}:${src}`}
          style={{
            flex: 1,
            minWidth: 0,
            background: art.kind === 'colors' ? src : `center / cover no-repeat url("${src}")`,
          }}
        />
      ))}
    </div>
  )
}
