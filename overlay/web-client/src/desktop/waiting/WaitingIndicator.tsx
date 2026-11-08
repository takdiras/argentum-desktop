/**
 * A small spinner beside a player's name while the game is waiting on them (see `waitingOn.ts`).
 * Shown only after a short delay so a quick pass doesn't flash it. Mounted by `LifeDisplay`, which
 * draws the name; renders nothing when nobody is being waited on.
 */
import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore.ts'
import { WAITING_SHOW_DELAY_MS, isWaitingOnPlayer } from './waitingOn'

const KEYFRAMES = '@keyframes argentum-waiting-spin { to { transform: rotate(360deg) } }'

function useWaitingOnPlayer(playerId: string): boolean {
  const waiting = useGameStore((s) => {
    const game = s.gameState
    if (!game) return false
    return isWaitingOnPlayer(playerId, {
      viewingPlayerId: game.viewingPlayerId,
      priorityPlayerId: game.priorityPlayerId ?? null,
      hasOwnDecision: s.pendingDecision != null,
      decidingPlayerId: s.opponentDecisionStatus?.playerId ?? null,
      gameOver: game.isGameOver || s.gameOverState != null,
      spectating: s.spectatingState != null,
    })
  })

  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!waiting) {
      setShown(false)
      return
    }
    const timer = window.setTimeout(() => setShown(true), WAITING_SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [waiting])
  return shown
}

export function WaitingIndicator({ playerId, color, name }: { playerId: string; color: string; name?: string | undefined }) {
  const shown = useWaitingOnPlayer(playerId)
  if (!shown) return null
  const label = name ? `Waiting for ${name}…` : 'Waiting for opponent…'
  return (
    <span role="status" aria-label={label} title={label} style={{ display: 'inline-flex', flex: 'none', alignItems: 'center' }}>
      <style>{KEYFRAMES}</style>
      <span
        aria-hidden
        style={{
          width: 11,
          height: 11,
          boxSizing: 'border-box',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.16)',
          borderTopColor: color,
          animation: 'argentum-waiting-spin 0.9s linear infinite',
        }}
      />
    </span>
  )
}
