/**
 * Sizing for the arena battlefield — plain data in, plain data out (no DOM, no React), so the
 * geometry is unit-testable. Same idea as upstream's `battlefieldLayout.ts` solver, but for a much
 * simpler board shape:
 *
 *   creatures + planeswalkers                (a centred, wrapping block)
 *   lands (left)                  other (right)   (a band along the outer edge)
 *
 * The solver picks the widest card for which every block's wrap lines, plus the gap between the
 * two blocks, fit the slot's height.
 */

/** Card height / width. Near-square: an art tile with a name bar, not a full card face. */
export const ARENA_CARD_RATIO = 0.9

/** Widest card, whatever room the board has. */
export const ARENA_MAX_CARD_WIDTH = 132

/** Narrowest card before the board is just clipped. */
export const ARENA_MIN_CARD_WIDTH = 40

/** Lands and enchantments/artifacts draw at this fraction of the creature width. */
export const ARENA_BACK_SCALE = 0.8

/** Extra width GameCard reserves around a card lying sideways (kept in step with its container). */
export const ARENA_TAP_PAD = 8

/** Gap between the creature block and the land/other band. */
export const ARENA_ZONE_GAP = 10

/** Horizontal peek of each card stacked behind a group's first. */
export const ARENA_STACK_OFFSET = 18

/** Share of the band's width lands may use when enchantments share it; the rest is for them. */
export const ARENA_LAND_SHARE = 0.58
export const ARENA_OTHER_SHARE = 0.38

export const arenaCardHeight = (width: number): number => Math.round(width * ARENA_CARD_RATIO)

/**
 * A real card's corner radius is 3 mm on a card 63 mm wide. The tile keeps that proportion, so its
 * corners match an actual card at any size. Upstream's fixed 8 px was tuned for a full 125 px card
 * and reads as noticeably rounder on a smaller tile.
 */
export const ARENA_CORNER_RATIO = 3 / 63

/** Corner radius in px for a tile `width` wide: never below 2 px, so a tiny tile still has a corner. */
export const arenaCornerRadius = (width: number): number => Math.max(2, Math.round(width * ARENA_CORNER_RATIO * 10) / 10)

/**
 * How far a tapped permanent turns. Deliberately a tilt, not upstream's 90° — an arena tile is
 * nearly square, so lying it on its side barely changes its shape and reads as "rotated" rather
 * than "tapped". The grey wash and tap icon in `ArenaCardFace` carry the rest of the signal.
 */
export const ARENA_TAP_TILT_DEG = 15

const TILT_RAD = (ARENA_TAP_TILT_DEG * Math.PI) / 180

/** Width of the box a tilted tile occupies: the bounding box of the rotated rectangle. */
export const arenaTiltedWidth = (width: number): number =>
  Math.ceil(width * Math.cos(TILT_RAD) + arenaCardHeight(width) * Math.sin(TILT_RAD))

/** Height of the box a tilted tile occupies. */
export const arenaTiltedHeight = (width: number): number =>
  Math.ceil(width * Math.sin(TILT_RAD) + arenaCardHeight(width) * Math.cos(TILT_RAD))

export interface ZoneCount {
  /** Rendered stacks in the zone. */
  count: number
  /** Cards peeking out behind a stack's first card, summed over the zone's stacks. */
  stackedExtra: number
  /** Stacks whose representative card is tapped — they take the tilted footprint. */
  tapped: number
}

export interface ArenaCounts {
  /** Creatures and planeswalkers, together. */
  front: ZoneCount
  lands: ZoneCount
  /** Enchantments, artifacts and everything else that isn't a creature, land or planeswalker. */
  other: ZoneCount
}

export interface ArenaLayout {
  cardWidth: number
  backWidth: number
  frontLines: number
  backLines: number
}

/** Wrap lines `zone` needs at `width`, given `avail` px of row. 0 for an empty zone. */
export function linesFor(zone: ZoneCount, width: number, avail: number, gap: number): number {
  if (zone.count <= 0) return 0
  const tapped = Math.min(zone.tapped, zone.count)
  const upright = width + ARENA_TAP_PAD
  const tilted = arenaTiltedWidth(width) + ARENA_TAP_PAD
  const total =
    (zone.count - tapped) * (upright + gap) + tapped * (tilted + gap) - gap + zone.stackedExtra * ARENA_STACK_OFFSET
  return Math.max(1, Math.ceil(total / Math.max(avail, tapped > 0 ? tilted : upright)))
}

/**
 * Height of a block of wrap lines. A line is as tall as its tallest tile, and the solver can't know
 * which line a tapped tile lands on, so a zone with any tapped stack reserves the tilted height.
 */
const blockHeight = (lines: number, width: number, hasTapped: boolean, gap: number): number =>
  lines > 0 ? lines * (hasTapped ? arenaTiltedHeight(width) : arenaCardHeight(width)) + (lines - 1) * gap : 0

export function solveArenaLayout(
  slotWidth: number,
  slotHeight: number,
  counts: ArenaCounts,
  opts: { gap: number; maxWidth?: number },
): ArenaLayout {
  const { gap } = opts
  const maxWidth = Math.max(ARENA_MIN_CARD_WIDTH, Math.min(opts.maxWidth ?? ARENA_MAX_CARD_WIDTH, ARENA_MAX_CARD_WIDTH))
  const hasLands = counts.lands.count > 0
  const hasOther = counts.other.count > 0

  const evaluate = (width: number) => {
    const backWidth = Math.max(ARENA_MIN_CARD_WIDTH, Math.round(width * ARENA_BACK_SCALE))
    const frontLines = linesFor(counts.front, width, slotWidth, gap)
    const landLines = linesFor(counts.lands, backWidth, hasOther ? slotWidth * ARENA_LAND_SHARE : slotWidth, gap)
    const otherLines = linesFor(counts.other, backWidth, hasLands ? slotWidth * ARENA_OTHER_SHARE : slotWidth, gap)
    const backLines = Math.max(landLines, otherLines)
    const backTapped = counts.lands.tapped + counts.other.tapped > 0
    const height =
      blockHeight(frontLines, width, counts.front.tapped > 0, gap) +
      blockHeight(backLines, backWidth, backTapped, gap) +
      (frontLines > 0 && backLines > 0 ? ARENA_ZONE_GAP : 0)
    return { cardWidth: width, backWidth, frontLines, backLines, height }
  }

  for (let w = Math.round(maxWidth); w > ARENA_MIN_CARD_WIDTH; w--) {
    const r = evaluate(w)
    if (r.height <= slotHeight) return { cardWidth: r.cardWidth, backWidth: r.backWidth, frontLines: r.frontLines, backLines: r.backLines }
  }
  const r = evaluate(ARENA_MIN_CARD_WIDTH)
  return { cardWidth: r.cardWidth, backWidth: r.backWidth, frontLines: r.frontLines, backLines: r.backLines }
}

/**
 * Grid-row weights for the two-player board under the arena layout: your battlefield gets the
 * larger share (about 62 %), the opponent's the smaller upper one (about 38 %).
 */
export const ARENA_OPPONENT_ROW_WEIGHT = 3
export const ARENA_PLAYER_ROW_WEIGHT = 5
