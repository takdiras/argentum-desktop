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
import { ARENA_LAND_SHARE, ARENA_OTHER_SHARE, ARENA_ZONE_GAP } from './arenaMetrics'

export function ArenaZones({
  isOpponent,
  creatures,
  planeswalkers,
  lands,
  other,
  renderGroup,
  sizes,
  backSizes,
}: {
  isOpponent: boolean
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

  const wrap = { display: 'flex', flexWrap: 'wrap', gap, minWidth: 0 } as const

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
        padding: '0 6px',
        boxSizing: 'border-box',
      }}
    >
      {/* Creatures take whatever height the band leaves and centre in it. */}
      <div
        style={{
          ...wrap,
          flex: '1 1 auto',
          alignContent: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          // An empty block still has to give its height to the band and not collapse the layout.
          minHeight: hasFront ? undefined : 0,
        }}
      >
        {creatures.map((g) => renderGroup(g, sizes))}
        {planeswalkers.map((g) => renderGroup(g, sizes))}
      </div>

      {(hasLands || hasOther) && (
        <ResponsiveContext.Provider value={backSizes}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flex: '0 0 auto' }}>
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
