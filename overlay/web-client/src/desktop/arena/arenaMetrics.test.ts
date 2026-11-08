import { describe, expect, it } from 'vitest'
import {
  ARENA_BACK_MIN_WIDTH,
  ARENA_BADGE_OVERHANG,
  ARENA_CARD_RATIO,
  ARENA_MAX_CARD_WIDTH,
  ARENA_MIN_CARD_WIDTH,
  ARENA_STACK_OFFSET,
  ARENA_TAP_TILT_DEG,
  arenaCardHeight,
  arenaCornerRadius,
  arenaTileBox,
  ARENA_ZONE_PAD_TOP,
  ARENA_ZONE_PAD_X,
  ARENA_CORNER_RATIO,
  arenaTiltedHeight,
  arenaTiltedWidth,
  linesFor,
  solveArenaLayout,
  type ArenaCounts,
} from './arenaMetrics'

const zone = (count: number, stackedExtra = 0, tapped = 0) => ({ count, stackedExtra, tapped })
const counts = (front: number, lands: number, other: number, tapped = 0): ArenaCounts => ({
  front: zone(front, 0, Math.min(tapped, front)),
  lands: zone(lands, 0, Math.min(tapped, lands)),
  other: zone(other, 0, Math.min(tapped, other)),
})
const GAP = 8

describe('arenaCardHeight', () => {
  it('is a near-square tile, shorter than the 1.4 full card', () => {
    expect(ARENA_CARD_RATIO).toBeLessThan(1.4)
    expect(arenaCardHeight(100)).toBe(90)
  })
})

describe('zone headroom', () => {
  it('covers the 8 px an ungroup toggle hangs above and left of its stack', () => {
    expect(ARENA_ZONE_PAD_TOP).toBeGreaterThanOrEqual(8)
    expect(ARENA_ZONE_PAD_X).toBeGreaterThanOrEqual(8)
  })
})

describe('arenaTileBox', () => {
  it('is the plain tile when upright', () => {
    expect(arenaTileBox(100, false)).toEqual({ width: 100, height: 90 })
  })

  it('is the tilted bounding box when tapped, larger both ways', () => {
    const box = arenaTileBox(100, true)
    expect(box).toEqual({ width: arenaTiltedWidth(100), height: arenaTiltedHeight(100) })
    expect(box.width).toBeGreaterThan(100)
    expect(box.height).toBeGreaterThan(90)
  })

  it('is not upstream\'s quarter-turn assumption (a tapped card as wide as it is tall)', () => {
    // Upstream sizes a tapped card `height` wide: 90 here, narrower than the tilted tile actually is.
    expect(arenaTileBox(100, true).width).toBeGreaterThan(arenaCardHeight(100))
  })
})

describe('stack peek', () => {
  it('leaves the cards behind a stack almost entirely hidden', () => {
    expect(ARENA_STACK_OFFSET).toBeLessThanOrEqual(8)
    expect(ARENA_STACK_OFFSET).toBeGreaterThan(0)
  })
})

describe('arenaCornerRadius', () => {
  it('matches a real card: 3 mm on a 63 mm wide card', () => {
    expect(ARENA_CORNER_RATIO).toBeCloseTo(3 / 63, 10)
    expect(arenaCornerRadius(63)).toBe(3)
    expect(arenaCornerRadius(126)).toBe(6)
  })

  it('is smaller than upstream\'s fixed 8 px at every size the layout draws', () => {
    for (const w of [40, 76, 95, 110, 132]) expect(arenaCornerRadius(w)).toBeLessThan(8)
  })

  it('scales with the tile and never drops below 2 px', () => {
    expect(arenaCornerRadius(132)).toBeGreaterThan(arenaCornerRadius(76))
    expect(arenaCornerRadius(20)).toBe(2)
  })
})

describe('tilted footprint', () => {
  it('is a slight tilt, not a quarter turn', () => {
    expect(ARENA_TAP_TILT_DEG).toBeGreaterThan(0)
    expect(ARENA_TAP_TILT_DEG).toBeLessThan(45)
  })

  it('is larger than the upright tile in both directions', () => {
    expect(arenaTiltedWidth(100)).toBeGreaterThan(100)
    expect(arenaTiltedHeight(100)).toBeGreaterThan(arenaCardHeight(100))
  })

  it('matches the bounding box of the rotated rectangle', () => {
    // 15° on a 100 x 90 tile: width 100cos15 + 90sin15 = 119.9, height 100sin15 + 90cos15 = 112.8
    expect(arenaTiltedWidth(100)).toBe(120)
    expect(arenaTiltedHeight(100)).toBe(113)
  })
})

describe('linesFor', () => {
  it('is zero for an empty zone and at least one otherwise', () => {
    expect(linesFor(zone(0), 100, 800, GAP)).toBe(0)
    expect(linesFor(zone(1), 100, 800, GAP)).toBe(1)
  })

  it('wraps when the row is too narrow, and counts stacked peeks', () => {
    expect(linesFor(zone(10), 100, 400, GAP)).toBeGreaterThan(linesFor(zone(10), 100, 4000, GAP))
    expect(linesFor(zone(3, 30), 100, 400, GAP)).toBeGreaterThan(linesFor(zone(3, 0), 100, 400, GAP))
  })

  it('gives tapped stacks more room, so a row of tapped lands wraps sooner', () => {
    // 8 upright tiles fit one 1000 px line (8 x 116 - 8 = 920); 8 tilted ones (8 x 148 - 8) do not.
    expect(linesFor(zone(8, 0, 0), 100, 1000, GAP)).toBe(1)
    expect(linesFor(zone(8, 0, 8), 100, 1000, GAP)).toBe(2)
  })
})

describe('solveArenaLayout', () => {
  it('gives an empty or sparse board the full card width', () => {
    expect(solveArenaLayout(1000, 400, counts(0, 0, 0), { gap: GAP }).cardWidth).toBe(ARENA_MAX_CARD_WIDTH)
    expect(solveArenaLayout(1000, 400, counts(2, 3, 1), { gap: GAP }).cardWidth).toBe(ARENA_MAX_CARD_WIDTH)
  })

  it('shrinks cards as the board fills and never goes below the floor', () => {
    const sparse = solveArenaLayout(1000, 300, counts(4, 4, 2), { gap: GAP }).cardWidth
    const crowded = solveArenaLayout(1000, 300, counts(24, 20, 14), { gap: GAP }).cardWidth
    expect(crowded).toBeLessThan(sparse)
    const absurd = solveArenaLayout(300, 120, counts(60, 60, 60), { gap: GAP })
    expect(absurd.cardWidth).toBe(ARENA_MIN_CARD_WIDTH)
  })

  it('fits the slot height whenever the floor allows it', () => {
    for (const [f, l, o] of [[6, 7, 2], [12, 9, 5], [3, 12, 0], [0, 6, 4]] as const) {
      const layout = solveArenaLayout(900, 260, counts(f, l, o), { gap: GAP })
      const block = (lines: number, h: number) => (lines > 0 ? lines * h + (lines - 1) * (GAP + ARENA_BADGE_OVERHANG) + ARENA_BADGE_OVERHANG : 0)
      const front = block(layout.frontLines, arenaCardHeight(layout.cardWidth))
      const back = block(layout.backLines, arenaCardHeight(layout.backWidth))
      // (nothing is tapped in these boards, so upright heights apply)
      const total = front + back + (front > 0 && back > 0 ? 10 : 0)
      if (layout.cardWidth > ARENA_MIN_CARD_WIDTH) expect(total).toBeLessThanOrEqual(260)
    }
  })

  it('shrinks cards when permanents are tapped, because tilted tiles need more room', () => {
    const untapped = solveArenaLayout(900, 260, counts(8, 8, 3, 0), { gap: GAP }).cardWidth
    const tapped = solveArenaLayout(900, 260, counts(8, 8, 3, 8), { gap: GAP }).cardWidth
    expect(tapped).toBeLessThan(untapped)
  })

  it('draws lands and enchantments smaller than creatures', () => {
    const layout = solveArenaLayout(1000, 400, counts(3, 5, 2), { gap: GAP })
    expect(layout.backWidth).toBeLessThan(layout.cardWidth)
  })

  it('keeps a lone creature at full size however many lands crowd the band', () => {
    const lands = solveArenaLayout(900, 400, counts(1, 12, 3), { gap: GAP })
    expect(lands.cardWidth).toBe(ARENA_MAX_CARD_WIDTH)
    expect(lands.backWidth).toBeLessThan(Math.round(ARENA_MAX_CARD_WIDTH * 0.8))
    expect(lands.backWidth).toBeGreaterThanOrEqual(ARENA_BACK_MIN_WIDTH)
  })

  it('shrinks creatures only once the band is already at its floor', () => {
    const layout = solveArenaLayout(900, 260, counts(24, 30, 6), { gap: GAP })
    expect(layout.cardWidth).toBeLessThan(ARENA_MAX_CARD_WIDTH)
    expect(layout.backWidth).toBeLessThanOrEqual(ARENA_BACK_MIN_WIDTH)
  })

  it('honours a smaller maximum width', () => {
    expect(solveArenaLayout(1000, 400, counts(2, 2, 0), { gap: GAP, maxWidth: 90 }).cardWidth).toBe(90)
  })
})
