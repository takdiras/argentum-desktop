/**
 * What sits behind a player's whole area: the playmat and the ring (see `Playmat.tsx`, `AreaFrame.tsx`).
 * Mounted as the first child of the area's own box by patch 0026, which also gives that box
 * `AREA_BACKDROP_HOST` so the backdrop can sit behind the area's cards without leaving it.
 * Renders nothing in the Classic layout, so Classic stays upstream's board.
 */
import type { CSSProperties } from 'react'
import { useArenaLayout } from './arenaLayoutStore'
import { AreaFrame } from './AreaFrame'
import { Playmat } from './Playmat'

/**
 * Style for the box that hosts a backdrop: a positioned stacking context, so the backdrop's
 * `z-index: -1` lands behind this box's content and above whatever is behind the box itself. The
 * `z-index: 2` is where the battlefield zone used to sit: above the opponent's hand, which the arena
 * layout tucks behind the tiles, yet below every floating panel (the stack, the HUD).
 */
export const AREA_BACKDROP_HOST: CSSProperties = { position: 'relative', isolation: 'isolate', zIndex: 2 }

export function AreaBackdrop({
  isOpponent,
  playerId,
  turnRing = false,
}: {
  isOpponent: boolean
  playerId?: string | undefined
  turnRing?: boolean
}) {
  const arena = useArenaLayout()
  if (!arena) return null
  return (
    <>
      <Playmat isOpponent={isOpponent} playerId={playerId} />
      <AreaFrame isOpponent={isOpponent} playerId={playerId} turnRing={turnRing} />
    </>
  )
}
