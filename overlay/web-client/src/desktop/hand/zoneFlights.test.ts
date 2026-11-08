import { describe, expect, it } from 'vitest'
import {
  FLIGHT_MS,
  STAGGER_CAP_MS,
  STAGGER_STEP_MS,
  animates,
  kindFor,
  locate,
  moves,
  scheduleStart,
  type Loc,
} from './zoneFlights'

const z = (zoneType: string, ownerId: string | undefined, cardIds: string[]) => ({ zoneId: { zoneType, ownerId }, cardIds })

describe('locate and moves', () => {
  const before = locate([z('Hand', 'p1', ['a', 'b']), z('Battlefield', 'p1', ['c']), z('Graveyard', 'p2', [])])

  it('treats the battlefield and stack as shared, so a change of controller is not a move', () => {
    const after = locate([z('Hand', 'p1', ['a', 'b']), z('Battlefield', 'p2', ['c'])])
    expect(moves(before, after)).toEqual([])
  })

  it('reports cards that changed zone, or owner of a personal zone', () => {
    const after = locate([z('Hand', 'p1', ['b']), z('Battlefield', undefined, ['c', 'a']), z('Graveyard', 'p2', [])])
    expect(moves(before, after)).toEqual([{ id: 'a', from: { zone: 'Hand', owner: 'p1' }, to: { zone: 'Battlefield', owner: null } }])
    const bounced = locate([z('Hand', 'p2', ['a', 'b']), z('Battlefield', 'p1', ['c'])])
    expect(moves(before, bounced).map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('ignores cards that were not there before (tokens, copies) and cards that left sight', () => {
    const after = locate([z('Hand', 'p1', ['a']), z('Battlefield', 'p1', ['c', 'new'])])
    expect(moves(before, after)).toEqual([])
  })
})

describe('animates', () => {
  const m = (from: string, to: string) => ({ id: 'x', from: { zone: from, owner: 'p1' }, to: { zone: to, owner: 'p1' } })

  it('animates a card going anywhere with a place on the table', () => {
    for (const [from, to] of [['Battlefield', 'Graveyard'], ['Hand', 'Graveyard'], ['Graveyard', 'Hand'], ['Battlefield', 'Exile'], ['Battlefield', 'Hand'], ['Library', 'Graveyard'], ['Stack', 'Graveyard']] as const) {
      expect(animates(m(from, to))).toBe(true)
    }
  })

  it('leaves draws, mulligans and unseen zones alone', () => {
    expect(animates(m('Library', 'Hand'))).toBe(false)
    expect(animates(m('Hand', 'Library'))).toBe(false)
    expect(animates(m('Command', 'Stack'))).toBe(false)
    expect(animates(m('Hand', 'Sideboard'))).toBe(false)
  })
})

describe('kindFor', () => {
  const at = (zone: string, owner: string | null): Loc => ({ zone, owner })

  it('picks the kind of landing', () => {
    expect(kindFor(at('Battlefield', null), 'me')).toBe('field')
    expect(kindFor(at('Stack', null), 'me')).toBe('stack')
    expect(kindFor(at('Graveyard', 'them'), 'me')).toBe('pile')
    expect(kindFor(at('Exile', 'me'), 'me')).toBe('pile')
    expect(kindFor(at('Library', 'me'), 'me')).toBe('pile')
  })

  it('a card into your hand lands in a slot, into theirs on the pile of their hand', () => {
    expect(kindFor(at('Hand', 'me'), 'me')).toBe('hand')
    expect(kindFor(at('Hand', 'them'), 'me')).toBe('pile')
  })

  it('has no landing for a zone with no place on the table', () => {
    expect(kindFor(at('Command', 'me'), 'me')).toBeNull()
  })
})

describe('flight timing', () => {
  it('the stack is the quickest, the battlefield the slowest', () => {
    expect(FLIGHT_MS.stack).toBeLessThan(FLIGHT_MS.pile)
    expect(FLIGHT_MS.pile).toBeLessThan(FLIGHT_MS.hand)
    expect(FLIGHT_MS.hand).toBeLessThan(FLIGHT_MS.field)
  })
})

describe('scheduleStart', () => {
  it('starts the first flight at once and ripples the rest one step apart', () => {
    let slot = 0
    const starts: number[] = []
    for (let i = 0; i < 4; i++) {
      const s = scheduleStart(1000, slot)
      starts.push(s.startAt)
      slot = s.nextSlot
    }
    expect(starts).toEqual([1000, 1000 + STAGGER_STEP_MS, 1000 + 2 * STAGGER_STEP_MS, 1000 + 3 * STAGGER_STEP_MS])
  })

  it('does not hold a flight back for a slot that has already passed', () => {
    expect(scheduleStart(5000, 1200).startAt).toBe(5000)
  })

  it('never makes a flight wait longer than the cap, however many are queued', () => {
    let slot = 0
    let last = 0
    for (let i = 0; i < 40; i++) {
      const s = scheduleStart(1000, slot)
      last = s.startAt
      slot = s.nextSlot
    }
    expect(last).toBe(1000 + STAGGER_CAP_MS)
  })
})
