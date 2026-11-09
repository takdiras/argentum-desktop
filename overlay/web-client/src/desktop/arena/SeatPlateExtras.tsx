/**
 * What a seat chip in the top row used to say that a board's name plate did not: whose turn it is,
 * hand size (with a changed maximum), speed, the monarch / initiative / dungeon markers, player
 * counters, commander damage, who is deciding, and the 1-9 key that focuses the board.
 *
 * At a row-rail table the plate carries all of it and the row goes away, freeing the strip along the
 * top. The two were showing the same name and life twice. Renders nothing elsewhere (two-player
 * games, team games, phones, Classic layout, spectators), where the rail is still the only place
 * for these. Mounted inside `BoardNamePlate` by patches 0022 and 0023.
 */
import { useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { useGameStore } from '@/store/gameStore'
import { selectGameState, useIdentityColor, useIsTeamGame, useOpponents } from '@/store/selectors'
import type { ClientPlayer } from '@/types'
import { useResponsiveContext } from '@/components/game/board/shared'
import { SpeedGauge } from '@/components/game/overlay/SpeedGauge'
import { useArenaLayout } from './arenaLayoutStore'
import {
  CORNER_BAND_BOTTOM,
  RAIL_ROW_INSET_LEFT,
  handLimitSuffix,
  plateDodge,
  railIsHorizontal,
  railViewportIsCompact,
  type PlateRect,
} from './arenaRail'
import { areaRing, holdsPriority } from './priorityFrameMetrics'

/** Whether plates carry the seat information (a row-rail pod, as a player). */
export function useSeatPlateRail(): boolean {
  const responsive = useResponsiveContext()
  const arena = useArenaLayout()
  const isTeamGame = useIsTeamGame()
  const opponents = useOpponents()
  const spectating = useGameStore((s) => s.spectatingState != null)
  return railIsHorizontal(arena, isTeamGame, railViewportIsCompact(responsive)) && opponents.length > 1 && !spectating
}

/** Whether it is this seat's turn, for the plate's turn ring (false when plates do not carry seat info). */
export function useSeatPlateTurn(player: ClientPlayer): boolean {
  const enabled = useSeatPlateRail()
  const activePlayerId = useGameStore((s) => selectGameState(s)?.activePlayerId)
  return enabled && !player.hasLost && activePlayerId === player.playerId
}

/**
 * Whether the plate shows the thin priority ring: this seat holds priority on someone else's turn.
 * On its own turn the turn ring (thicker, see `priorityFrameMetrics`) already marks the plate.
 */
export function useSeatPlatePriority(player: ClientPlayer): boolean {
  const turn = useSeatPlateTurn(player)
  const enabled = useSeatPlateRail()
  const priority = useGameStore((s) =>
    holdsPriority(player.playerId, selectGameState(s)?.priorityPlayerId, player.hasLost),
  )
  return enabled && areaRing(turn, priority) === 'priority'
}

/**
 * How far to push a top-anchored plate down so it clears the corner controls (see `plateDodge`).
 * Measured from the real boxes: the Fullscreen / settings buttons on the left are a fixed band, and
 * the right-hand zone is Concede plus the camera switches beside it. The plate's natural position is
 * its measured one minus the dodge already applied, so the result settles instead of oscillating.
 */
export function useSeatPlateDodge(ref: RefObject<HTMLElement | null>, active: boolean): number {
  const enabled = useSeatPlateRail()
  const [dodge, setDodge] = useState(0)
  const measure = () => {
    const el = ref.current
    if (!el) return
    if (!active || !enabled) {
      if (dodge !== 0) setDodge(0)
      return
    }
    const r = el.getBoundingClientRect()
    const natural: PlateRect = { left: r.left, right: r.right, top: r.top - dodge, bottom: r.bottom - dodge }
    const zones: PlateRect[] = [{ left: 0, right: RAIL_ROW_INSET_LEFT, top: 0, bottom: CORNER_BAND_BOTTOM }]
    const right = document.querySelector('[data-camera-controls]')?.parentElement?.getBoundingClientRect()
    if (right) zones.push({ left: right.left, right: right.right, top: 0, bottom: Math.max(right.bottom, CORNER_BAND_BOTTOM) })
    const next = Math.round(plateDodge(natural, zones))
    if (next !== dodge) setDodge(next)
  }
  // Every render (extras come and go), and when the window changes size.
  useLayoutEffect(measure)
  useLayoutEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  })
  return dodge
}

export function SeatPlateExtras({ player, showHand }: { player: ClientPlayer; showHand: boolean }) {
  const enabled = useSeatPlateRail()
  const opponents = useOpponents()
  const seat = useIdentityColor(player.playerId)
  const priorityPlayerId = useGameStore((s) => selectGameState(s)?.priorityPlayerId)
  const activePlayerId = useGameStore((s) => selectGameState(s)?.activePlayerId)
  const deciding = useGameStore((s) => s.opponentDecisionStatus)

  // The digit that focuses this board: same order useMultiplayerView indexes (living opponents).
  const keyIndex = useMemo(() => {
    const i = opponents.filter((o) => !o.hasLost).findIndex((o) => o.playerId === player.playerId)
    return i >= 0 ? i + 1 : null
  }, [opponents, player.playerId])

  if (!enabled || player.hasLost) return null

  const isActiveTurn = activePlayerId === player.playerId
  const hasPriority = priorityPlayerId === player.playerId
  const isDeciding = deciding?.playerId === player.playerId
  const limited = handLimitSuffix(player.maxHandSize) !== ''
  const commanderDamage = player.commanderDamage ?? []
  const worstCommander = commanderDamage.reduce<(typeof commanderDamage)[number] | null>(
    (worst, e) => (worst == null || e.amount > worst.amount ? e : worst),
    null,
  )

  const counter = (key: string, title: string, color: string, text: string) => (
    <span key={key} title={title} style={{ fontSize: 11, fontWeight: 800, color, flexShrink: 0 }}>
      {text}
    </span>
  )
  const effects = player.activeEffects ?? []
  const monarch = effects.some((e) => e.effectId === 'monarch')
  const initiative = effects.some((e) => e.effectId === 'initiative')

  return (
    <>
      {isActiveTurn && (
        <span aria-hidden title="Their turn" style={{ color: seat.bright, fontSize: 9, flexShrink: 0 }}>
          ▶
        </span>
      )}
      {showHand && (
        <span
          title={limited ? `Hand ${player.handSize} · maximum hand size ${player.maxHandSize ?? '∞'}` : 'Cards in hand'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
            color: limited ? '#f0d488' : '#9fb0d0',
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 8,
              height: 11,
              borderRadius: 2,
              border: `1px solid ${limited ? '#f0d488' : '#8899bb'}`,
              background: 'linear-gradient(135deg, rgba(120,140,200,0.35), rgba(40,50,90,0.6))',
            }}
          />
          {player.handSize}
          {handLimitSuffix(player.maxHandSize)}
        </span>
      )}
      {(player.speed ?? 0) > 0 && <SpeedGauge speed={player.speed ?? 0} compact />}
      {monarch && <span title={`${player.name} is the monarch`} style={{ fontSize: 13, flexShrink: 0 }}>👑</span>}
      {initiative && <span title={`${player.name} has the initiative`} style={{ fontSize: 13, flexShrink: 0 }}>🗝️</span>}
      {player.dungeon && (
        <span
          title={`${player.dungeon.name} — ${player.dungeon.rooms[player.dungeon.currentRoom]?.name ?? ''}`}
          style={{ fontSize: 13, flexShrink: 0 }}
        >
          🧭
        </span>
      )}
      {player.poisonCounters > 0 &&
        counter('poison', `${player.poisonCounters}/10 poison counters`, '#71f5a7', `☠${player.poisonCounters}`)}
      {(player.radCounters ?? 0) > 0 &&
        counter('rad', `${player.radCounters} radiation counters`, '#a3e635', `☢${player.radCounters}`)}
      {(player.energyCounters ?? 0) > 0 &&
        counter('energy', `${player.energyCounters} energy counters`, '#fde68a', `⚡${player.energyCounters}`)}
      {(player.experienceCounters ?? 0) > 0 &&
        counter('xp', `${player.experienceCounters} experience counters`, '#bfdbfe', `XP${player.experienceCounters}`)}
      {worstCommander && worstCommander.amount > 0 && (
        <span
          title={commanderDamage.map((e) => `${e.commanderName}: ${e.amount}/${e.threshold}`).join('\n')}
          style={{
            fontSize: 11,
            fontWeight: 800,
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
            color:
              worstCommander.threshold - worstCommander.amount <= 3
                ? '#ff5555'
                : worstCommander.threshold - worstCommander.amount <= 7
                  ? '#ffae7a'
                  : '#b9925f',
          }}
        >
          ⚔{worstCommander.amount}/{worstCommander.threshold}
        </span>
      )}
      {isDeciding ? (
        <span
          aria-hidden
          title={deciding?.displayText ?? 'Deciding'}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '2px solid rgba(255, 193, 7, 0.3)',
            borderTopColor: '#ffc107',
            animation: 'argentum-seat-spin 0.9s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : hasPriority && !isActiveTurn ? (
        <span
          aria-hidden
          title="Holding priority"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#ffc107',
            boxShadow: '0 0 5px rgba(255, 193, 7, 0.8)',
            flexShrink: 0,
          }}
        />
      ) : null}
      {keyIndex != null && keyIndex <= 9 && (
        <kbd
          aria-hidden
          title={`Press ${keyIndex} to focus this board`}
          style={{
            flexShrink: 0,
            minWidth: 13,
            height: 13,
            padding: '0 3px',
            boxSizing: 'border-box',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.18)',
            background: 'rgba(0, 0, 0, 0.35)',
            color: '#8a90a0',
            fontFamily: 'inherit',
            fontSize: 9,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {keyIndex}
        </kbd>
      )}
      <style>{'@keyframes argentum-seat-spin { to { transform: rotate(360deg) } }'}</style>
    </>
  )
}
