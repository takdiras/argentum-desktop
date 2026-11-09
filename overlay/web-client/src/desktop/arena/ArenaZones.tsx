/**
 * The arena battlefield's zones, in place of upstream's two centred rows:
 *
 *   creatures + planeswalkers      one centred, wrapping block, nearest the middle of the table
 *   lands (left)       enchantments / artifacts / other (right)      a band along the outer edge
 *
 * Mine sits at the bottom of the screen with the band last; the opponent's mirrors it, with the
 * band first (top edge) and the creatures nearest the centre. Cards are drawn by the caller's
 * `renderGroup` — upstream's `renderWithAttachments` — so auras, equipment, stacks, targeting and
 * every other per-permanent behaviour are unchanged.
 */
import type { ReactNode } from 'react'
import type { GroupedCard } from '@/store/selectors.ts'
import type { ResponsiveSizes } from '@/hooks/useResponsive'
import { ResponsiveContext } from '@/components/game/board/shared'
import { Playmat } from './Playmat'
import { PriorityFrame } from './PriorityFrame'
import {
  ARENA_BADGE_OVERHANG,
  ARENA_LAND_SHARE,
  ARENA_OTHER_SHARE,
  ARENA_ZONE_GAP,
  ARENA_ZONE_PAD_TOP,
  ARENA_ZONE_PAD_X,
} from './arenaMetrics'

export function ArenaZones({
  isOpponent,
  playerId,
  creatures,
  planeswalkers,
  lands,
  other,
  renderGroup,
  sizes,
  backSizes,
}: {
  isOpponent: boolean
  /** Whose board this is when it isn't simply "you" / "the opponent" (a multiplayer cell). */
  playerId?: string | undefined
  creatures: readonly GroupedCard[]
  planeswalkers: readonly GroupedCard[]
  lands: readonly GroupedCard[]
  other: readonly GroupedCard[]
  renderGroup: (group: GroupedCard, rowSizes: ResponsiveSizes) => ReactNode
  sizes: ResponsiveSizes
  backSizes: ResponsiveSizes
}) {
  const hasFront = creatures.length + planeswalkers.length > 0
  const hasLands = lands.length > 0
  const hasOther = other.length > 0
  const gap = sizes.cardGap

  // Rows are spaced further apart by the badge overhang: each tile's P/T badge hangs below it.
  const wrap = { display: 'flex', flexWrap: 'wrap', columnGap: gap, rowGap: gap + ARENA_BADGE_OVERHANG, minWidth: 0 } as const

  return (
    <div
      data-zone={isOpponent ? 'opponent-battlefield' : 'player-battlefield'}
      data-layout="arena"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        // Opponent: the band goes on top, the creatures toward the middle of the table.
        flexDirection: isOpponent ? 'column-reverse' : 'column',
        gap: hasFront && (hasLands || hasOther) ? ARENA_ZONE_GAP : 0,
        padding: `${ARENA_ZONE_PAD_TOP}px ${ARENA_ZONE_PAD_X}px 0`,
        boxSizing: 'border-box',
        // Above the opponent's hand, which the arena layout tucks behind the tiles, yet below every
        // floating panel (the stack, the HUD), which all sit higher.
        position: 'relative',
        zIndex: 2,
      }}
    >
      <Playmat isOpponent={isOpponent} playerId={playerId} />
      {/* Ring in the priority holder's colour: where the game is waiting right now. */}
      <PriorityFrame isOpponent={isOpponent} playerId={playerId} />
      {/* Creatures take whatever height the band leaves and centre in it. */}
      <div
        style={{
          ...wrap,
          flex: '1 1 auto',
          alignContent: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: ARENA_BADGE_OVERHANG,
          // An empty block still has to give its height to the band and not collapse the layout.
          minHeight: hasFront ? undefined : 0,
        }}
      >
        {creatures.map((g) => renderGroup(g, sizes))}
        {planeswalkers.map((g) => renderGroup(g, sizes))}
      </div>

      {(hasLands || hasOther) && (
        <ResponsiveContext.Provider value={backSizes}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flex: '0 0 auto', paddingBottom: ARENA_BADGE_OVERHANG }}>
            <div
              style={{
                ...wrap,
                justifyContent: 'flex-start',
                alignItems: 'flex-end',
                maxWidth: hasOther ? `${ARENA_LAND_SHARE * 100}%` : '100%',
              }}
              data-zone={isOpponent ? 'opponent-lands' : 'player-lands'}
            >
              {lands.map((g) => renderGroup(g, backSizes))}
            </div>
            <div
              style={{
                ...wrap,
                justifyContent: 'flex-end',
                alignItems: 'flex-end',
                marginLeft: 'auto',
                maxWidth: hasLands ? `${ARENA_OTHER_SHARE * 100}%` : '100%',
              }}
              data-zone={isOpponent ? 'opponent-other' : 'player-other'}
            >
              {other.map((g) => renderGroup(g, backSizes))}
            </div>
          </div>
        </ResponsiveContext.Provider>
      )}
    </div>
  )
}
