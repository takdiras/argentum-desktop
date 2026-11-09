/**
 * A thin ring in the owner's seat colour around the battlefield of whoever holds priority (see
 * `priorityFrameMetrics.ts`). Drawn inside the zone's bounds, above the playmat, and never takes a click,
 * so cards, targeting and drops are unaffected. It stays mounted and fades, so passing priority
 * reads as the ring moving rather than flickering.
 */
import { useGameStore } from '@/store/gameStore.ts'
import { useIdentityColor } from '@/store/selectors.ts'
import { PRIORITY_FRAME_RADIUS, PRIORITY_FRAME_WIDTH, holdsPriority } from './priorityFrameMetrics'
import { useBoardOwnerId } from './useBoardOwnerId'

export function PriorityFrame({ isOpponent, playerId }: { isOpponent: boolean; playerId?: string | undefined }) {
  const ownerId = useBoardOwnerId(isOpponent, playerId)
  const seat = useIdentityColor(ownerId)
  const active = useGameStore((s) =>
    holdsPriority(
      ownerId,
      s.gameState?.priorityPlayerId,
      s.gameState?.players.find((p) => p.playerId === ownerId)?.hasLost ?? false,
    ),
  )

  return (
    <div
      aria-hidden
      data-priority-frame={active ? 'on' : 'off'}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        boxSizing: 'border-box',
        borderRadius: PRIORITY_FRAME_RADIUS,
        border: `${PRIORITY_FRAME_WIDTH}px solid ${seat.base}`,
        boxShadow: `0 0 8px 0 ${seat.soft}, inset 0 0 8px 0 ${seat.soft}`,
        opacity: active ? 1 : 0,
        transition: 'opacity 150ms',
      }}
    />
  )
}
