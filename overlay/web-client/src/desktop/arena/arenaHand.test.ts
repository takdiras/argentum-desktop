import { describe, expect, it } from 'vitest'
import { ARENA_HAND_TUCK, ARENA_OPPONENT_HAND_Z, arenaHandTuck, arenaOpponentHandReservation } from './arenaHand'

describe('arenaOpponentHandReservation', () => {
  it('is far less than the whole small-card row upstream reserves', () => {
    expect(arenaOpponentHandReservation(111)).toBeLessThan(111)
  })

  it('never drops below what the fixed top-corner controls need', () => {
    expect(arenaOpponentHandReservation(10)).toBe(44)
    expect(arenaOpponentHandReservation(111)).toBeGreaterThanOrEqual(44)
  })

  it('grows with very large hands rather than clipping them', () => {
    expect(arenaOpponentHandReservation(400)).toBe(72)
  })
})

describe('ARENA_OPPONENT_HAND_Z', () => {
  it('sits below the arena zones (z-index 2) so the tiles paint over the hand', () => {
    expect(ARENA_OPPONENT_HAND_Z).toBeLessThan(2)
  })
})

describe('arenaHandTuck', () => {
  it('tucks only part of a typical cell hand band behind the name plate', () => {
    // A cell hand band is about 100 px (a 69 px fan box plus its 30 px edge overhang).
    expect(arenaHandTuck(99)).toBe(43)
    // Less than half: the fan has to stay readable, not vanish behind the plate.
    expect(arenaHandTuck(99) / 99).toBeLessThan(0.5)
    expect(ARENA_HAND_TUCK).toBeGreaterThan(0.2)
    expect(ARENA_HAND_TUCK).toBeLessThan(0.5)
  })

  it('always leaves enough of the band showing to count the cards', () => {
    for (const band of [40, 60, 99, 102, 140]) expect(band - arenaHandTuck(band)).toBeGreaterThanOrEqual(40)
  })

  it('never tucks a negative amount, even for a band smaller than the peek', () => {
    expect(arenaHandTuck(10)).toBe(0)
    expect(arenaHandTuck(0)).toBe(0)
  })
})
