import { describe, expect, it } from 'vitest'
import {
  DRAGGED_CARD_SIZE,
  DROP_MEMORY_MS,
  PLAY_FLIGHT_MS,
  PLAY_REVEAL_AT,
  STACK_FLIGHT_MS,
  enteredIds,
  isPlayDrop,
  isStackAbility,
  lerpBox,
  pickAbilitySource,
  pickOrigin,
  playProgress,
  type Box,
} from './playFlight'

const box = (cx: number): Box => ({ cx, cy: 0, w: 100, h: 140, rotation: 0 })

describe('playProgress', () => {
  it('starts at the origin, solid and unrevealed', () => {
    expect(playProgress(0)).toEqual({ t: 0, reveal: false, opacity: 1, done: false })
  })

  it('shows the real card, and fades the flying one, only near the end', () => {
    expect(playProgress(PLAY_FLIGHT_MS * (PLAY_REVEAL_AT - 0.05)).reveal).toBe(false)
    const fading = playProgress(PLAY_FLIGHT_MS * (PLAY_REVEAL_AT + 0.1))
    expect(fading.reveal).toBe(true)
    expect(fading.opacity).toBeGreaterThan(0)
    expect(fading.opacity).toBeLessThan(1)
  })

  it('ends on the field, invisible', () => {
    expect(playProgress(PLAY_FLIGHT_MS)).toEqual({ t: 1, reveal: true, opacity: 0, done: true })
    expect(playProgress(PLAY_FLIGHT_MS * 3).done).toBe(true)
  })
})

describe('playProgress duration', () => {
  it('the stack flight is quicker than the field flight, and runs its whole course in its own time', () => {
    expect(STACK_FLIGHT_MS).toBeLessThan(PLAY_FLIGHT_MS)
    expect(playProgress(STACK_FLIGHT_MS, STACK_FLIGHT_MS)).toEqual({ t: 1, reveal: true, opacity: 0, done: true })
    expect(playProgress(STACK_FLIGHT_MS).done).toBe(false)
  })
})

describe('lerpBox', () => {
  it('runs from one box to the other', () => {
    const a: Box = { cx: 0, cy: 0, w: 88, h: 123, rotation: -5 }
    const b: Box = { cx: 200, cy: 100, w: 60, h: 54, rotation: 0 }
    expect(lerpBox(a, b, 0)).toEqual(a)
    expect(lerpBox(a, b, 1)).toEqual(b)
    expect(lerpBox(a, b, 0.5)).toEqual({ cx: 100, cy: 50, w: 74, h: 88.5, rotation: -2.5 })
  })
})

describe('enteredIds', () => {
  it('lists only ids that were not there before', () => {
    expect(enteredIds(new Set(['a', 'b']), ['b', 'c', 'a', 'd'])).toEqual(['c', 'd'])
  })
})

describe('pickOrigin', () => {
  const drop = { cardId: 'x', x: 300, y: 200, at: 1000 }

  it('starts from where you dropped the card you just dragged', () => {
    expect(pickOrigin('x', 1500, { drop, hand: box(1), elsewhere: box(2) })).toEqual({ cx: 300, cy: 200, ...DRAGGED_CARD_SIZE })
  })

  it('ignores a drop of another card, or a stale one, and uses the hand slot', () => {
    expect(pickOrigin('y', 1500, { drop, hand: box(1), elsewhere: box(2) })).toEqual(box(1))
    expect(pickOrigin('x', 1000 + DROP_MEMORY_MS + 1, { drop, hand: box(1), elsewhere: box(2) })).toEqual(box(1))
  })

  it('falls back to wherever else the card was drawn, then to nothing', () => {
    expect(pickOrigin('x', 1500, { drop: null, hand: null, elsewhere: box(2) })).toEqual(box(2))
    expect(pickOrigin('x', 1500, { drop: null, hand: null, elsewhere: null })).toBeNull()
  })
})

describe('isPlayDrop', () => {
  const from = { x: 500, y: 700 }

  it('is a play when dragged far enough and let go above the hand', () => {
    expect(isPlayDrop(from, { x: 520, y: 300 }, 650)).toBe(true)
  })

  it('is not a play when let go over the hand, or after a short drag', () => {
    expect(isPlayDrop(from, { x: 520, y: 680 }, 650)).toBe(false)
    expect(isPlayDrop(from, { x: 510, y: 690 }, null)).toBe(false)
  })

  it('counts any far-enough drag when there is no hand to measure', () => {
    expect(isPlayDrop(from, { x: 100, y: 710 }, null)).toBe(true)
  })
})

describe('pickAbilitySource', () => {
  const field = [
    { id: 'a', name: 'Llanowar Elves', controllerId: 'me' },
    { id: 'b', name: 'Llanowar Elves', controllerId: 'me' },
    { id: 'c', name: 'Llanowar Elves', controllerId: 'them' },
    { id: 'd', name: 'Prodigal Pyromancer', controllerId: 'me' },
  ]

  it('finds the permanent with that name and controller', () => {
    expect(pickAbilitySource(field, 'Prodigal Pyromancer', 'me', new Set())).toBe('d')
    expect(pickAbilitySource(field, 'Llanowar Elves', 'them', new Set())).toBe('c')
  })

  it('among identical permanents prefers the one that just tapped', () => {
    expect(pickAbilitySource(field, 'Llanowar Elves', 'me', new Set(['b']))).toBe('b')
    expect(pickAbilitySource(field, 'Llanowar Elves', 'me', new Set())).toBe('a')
  })

  it('is null when nothing on the field matches', () => {
    expect(pickAbilitySource(field, 'Grizzly Bears', 'me', new Set())).toBeNull()
    expect(pickAbilitySource(field, 'Prodigal Pyromancer', 'them', new Set())).toBeNull()
  })
})

describe('isStackAbility', () => {
  it('reads the card type or the type line', () => {
    expect(isStackAbility({ cardTypes: ['Ability'] })).toBe(true)
    expect(isStackAbility({ cardTypes: [], typeLine: 'Triggered Ability' })).toBe(true)
    expect(isStackAbility({ cardTypes: ['Instant'], typeLine: 'Instant' })).toBe(false)
  })
})

describe('pickAbilitySource with a decorated name', () => {
  const field = [
    { id: 'a', name: 'Elves', controllerId: 'me' },
    { id: 'b', name: 'Elves of Deep Shadow', controllerId: 'me' },
  ]
  it('falls back to the source whose name the ability name begins with, longest first', () => {
    expect(pickAbilitySource(field, 'Elves of Deep Shadow ability', 'me', new Set())).toBe('b')
  })
})
