import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '@/store/gameStore.ts'
import { selectGameState, selectViewingPlayerId } from '@/store/selectors.ts'
import type { EntityId } from '@/types'
import { computeIncomingDamage, formatIncomingDamage } from './incomingDamage'

const BADGE_WIDTH = 46
const EDGE_GAP = 6

interface Placed {
  targetId: EntityId
  label: string
  x: number
  y: number
}

/**
 * Where a defender's badge sits. A player's badge goes just outside their name plate or life orb (the name is on its
 * other side); your own HUD orb has its name on the right, so there it goes on the left. A planeswalker or battle
 * wears it on the top-right corner of its card, where the name line is.
 */
function anchorFor(targetId: EntityId, viewingPlayerId: EntityId | null): { x: number; y: number } | null {
  const cardEl = document.querySelector(`[data-card-id="${targetId}"]`)
  if (cardEl) {
    const r = cardEl.getBoundingClientRect()
    return { x: r.right - BADGE_WIDTH - 4, y: r.top + 4 }
  }
  const lifeEl = document.querySelector(`[data-life-id="${targetId}"]`)
  if (!lifeEl) return null
  const r = lifeEl.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  const ownHudOrb = targetId === viewingPlayerId && !lifeEl.hasAttribute('data-board-plate') && !lifeEl.hasAttribute('data-rail-chip')
  const x = ownHudOrb ? r.left - BADGE_WIDTH - EDGE_GAP : r.right + EDGE_GAP
  return { x: Math.min(Math.max(x, 4), window.innerWidth - BADGE_WIDTH - 4), y: r.top + r.height / 2 - 11 }
}

/**
 * The damage the declared attack is about to deal, as a small negative number beside each defender (player,
 * planeswalker or battle), shrinking as blocks are declared and gone once combat damage is dealt. The sum is
 * `incomingDamage.ts`; this only reads the store and puts the numbers on screen.
 */
export function IncomingDamageBadges() {
  const gameState = useGameStore(selectGameState)
  const combatState = useGameStore((state) => state.combatState)
  const opponentAttackers = useGameStore((state) => state.opponentAttackerTargets)
  const opponentBlocks = useGameStore((state) => state.opponentBlockerAssignments)
  const viewingPlayerId = useGameStore(selectViewingPlayerId)

  const damage = useMemo(() => {
    const players = gameState?.players ?? []
    // Mirrors the combat slice's own default: the sole opponent, or the defender last picked.
    const soleOpponent =
      players.length === 2 ? players.find((p) => p.playerId !== (combatState?.actingSeat ?? viewingPlayerId))?.playerId ?? null : null
    return computeIncomingDamage({
      step: gameState?.currentStep,
      combat: gameState?.combat,
      local: combatState
        ? {
            mode: combatState.mode,
            selectedAttackers: combatState.selectedAttackers,
            attackerTargets: combatState.attackerTargets,
            defaultDefenderId: combatState.stickyDefenderId ?? soleOpponent,
            blockerAssignments: combatState.blockerAssignments,
            proposedBlockerAssignments: combatState.proposedBlockerAssignments,
          }
        : null,
      opponentAttackers,
      opponentBlocks,
      cards: gameState?.cards,
    })
  }, [gameState, combatState, opponentAttackers, opponentBlocks, viewingPlayerId])

  const [placed, setPlaced] = useState<Placed[]>([])
  useEffect(() => {
    if (damage.length === 0) {
      setPlaced((prev) => (prev.length === 0 ? prev : []))
      return
    }
    // Boards slide and cards animate, so re-measure while there is something to show (like the arrows do).
    const measure = () => {
      const next: Placed[] = []
      for (const d of damage) {
        const pos = anchorFor(d.targetId, viewingPlayerId)
        if (pos) next.push({ targetId: d.targetId, label: formatIncomingDamage(d), x: Math.round(pos.x), y: Math.round(pos.y) })
      }
      const json = JSON.stringify(next)
      setPlaced((prev) => (JSON.stringify(prev) === json ? prev : next))
    }
    measure()
    const timer = setInterval(measure, 100)
    return () => clearInterval(timer)
  }, [damage, viewingPlayerId])

  if (placed.length === 0) return null
  return (
    <>
      {placed.map(({ targetId, label, x, y }) => (
        <div
          key={targetId}
          data-incoming-damage={targetId}
          title="Combat damage this attack is about to deal"
          style={{
            position: 'fixed',
            left: x,
            top: y,
            minWidth: BADGE_WIDTH - 12,
            height: 22,
            padding: '0 6px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            border: '1.5px solid #ff4444',
            background: 'rgba(24, 6, 8, 0.92)',
            boxShadow: '0 0 10px rgba(255, 68, 68, 0.45)',
            color: '#ff7070',
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            pointerEvents: 'none',
            // Above the board, name plates (56) and the stack (80); below the pass button (100) and every modal.
            zIndex: 90,
          }}
        >
          {label}
        </div>
      ))}
    </>
  )
}
