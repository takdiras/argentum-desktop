import { describe, expect, it } from 'vitest'
import { dropIndex, moveId, orderHand } from './handOrder'

const card = (id: string) => ({ id })
const ids = (cards: { id: string }[]) => cards.map((c) => c.id)

describe('orderHand', () => {
  it('follows the saved order', () => {
    expect(ids(orderHand([card('a'), card('b'), card('c')], ['c', 'a', 'b']))).toEqual(['c', 'a', 'b'])
  })

  it('puts cards the order has never seen on the right, in hand order', () => {
    expect(ids(orderHand([card('a'), card('b'), card('c'), card('d')], ['c', 'a']))).toEqual(['c', 'a', 'b', 'd'])
  })

  it('ignores saved ids that left the hand', () => {
    expect(ids(orderHand([card('a'), card('b')], ['x', 'b', 'y', 'a']))).toEqual(['b', 'a'])
  })

  it('is the hand itself with no saved order', () => {
    expect(ids(orderHand([card('a'), card('b')], []))).toEqual(['a', 'b'])
  })
})

describe('moveId', () => {
  it('moves a card to a slot', () => {
    expect(moveId(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveId(['a', 'b', 'c', 'd'], 'd', 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('clamps the slot and leaves an unknown card alone', () => {
    expect(moveId(['a', 'b', 'c'], 'a', 99)).toEqual(['b', 'c', 'a'])
    expect(moveId(['a', 'b', 'c'], 'a', -4)).toEqual(['a', 'b', 'c'])
    expect(moveId(['a', 'b'], 'zzz', 0)).toEqual(['a', 'b'])
  })
})

describe('dropIndex', () => {
  it('maps the pointer to the slot whose card centre is nearest', () => {
    // 100 px cards 60 px apart: centres at 50, 110, 170, 230
    expect(dropIndex(50, 60, 100, 4)).toBe(0)
    expect(dropIndex(100, 60, 100, 4)).toBe(1)
    expect(dropIndex(175, 60, 100, 4)).toBe(2)
    expect(dropIndex(900, 60, 100, 4)).toBe(3)
    expect(dropIndex(-40, 60, 100, 4)).toBe(0)
  })

  it('is 0 for a hand of one', () => {
    expect(dropIndex(500, 60, 100, 1)).toBe(0)
  })
})
