/**
 * The ring around a player's whole area, in the owner's seat colour (rules in `priorityFrameMetrics.ts`):
 * thick on the seat whose turn it is, thin on a seat that holds priority off its turn, none otherwise.
 * Drawn inside the area's bounds, above the playmat, and never takes a click, so cards, targeting and
 * drops are unaffected. It stays mounted and fades, so passing priority reads as the ring moving
 * rather than flickering.
 */
import { useGameStore } from '@/store/gameStore.ts'
import { useIdentityColor } from '@/store/selectors.ts'
import {
  AREA_RING_INSET,
  AREA_RING_RADIUS,
  areaRing,
  areaRingWidth,
  holdsPriority,
} from './priorityFrameMetrics'
import { useBoardOwnerId } from './useBoardOwnerId'

export function AreaFrame({
  isOpponent,
  playerId,
  turnRing,
}: {
  isOpponent: boolean
  playerId?: string | undefined
  /** This area carries a turn ring (its seat is the active player, at a table that draws one). */
  turnRing: boolean
}) {
  const ownerId = useBoardOwnerId(isOpponent, playerId)
  const seat = useIdentityColor(ownerId)
  const priority = useGameStore((s) =>
    holdsPriority(
      ownerId,
      s.gameState?.priorityPlayerId,
      s.gameState?.players.find((p) => p.playerId === ownerId)?.hasLost ?? false,
    ),
  )
  const ring = areaRing(turnRing, priority)

  return (
    <div
      aria-hidden
      data-area-ring={ring}
      style={{
        position: 'absolute',
        inset: AREA_RING_INSET,
        zIndex: -1,
        pointerEvents: 'none',
        boxSizing: 'border-box',
        borderRadius: AREA_RING_RADIUS,
        border: `${areaRingWidth(ring)}px solid ${seat.base}`,
        boxShadow:
          ring === 'turn'
            ? `0 0 10px 0 ${seat.soft}, inset 0 0 12px 0 ${seat.soft}`
            : `0 0 8px 0 ${seat.soft}, inset 0 0 8px 0 ${seat.soft}`,
        opacity: ring === 'none' ? 0 : 1,
        transition: 'opacity 150ms',
      }}
    />
  )
}
