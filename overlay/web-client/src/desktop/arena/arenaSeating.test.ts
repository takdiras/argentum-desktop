import { describe, expect, it } from 'vitest'
import { freeForAllRows } from './arenaSeating'

// Seats are named in turn order from the anchor: a (you), then b, c, d … walking left.
const seats = (n: number) => 'abcdefgh'.slice(0, n).split('')

describe('freeForAllRows', () => {
  it('puts you at the bottom centre with six players', () => {
    // b sits to your left, f to your right; c d e run across the top, left to right.
    expect(freeForAllRows(seats(6))).toEqual({ bottom: ['b', 'a', 'f'], top: ['c', 'd', 'e'] })
  })

  it('centres you with seven players too', () => {
    expect(freeForAllRows(seats(7))).toEqual({ bottom: ['b', 'a', 'g'], top: ['c', 'd', 'e', 'f'] })
  })

  it('keeps every seat exactly once and the bottom row no more crowded than the top', () => {
    for (let n = 2; n <= 8; n++) {
      const { bottom, top } = freeForAllRows(seats(n))
      expect([...bottom, ...top].sort()).toEqual(seats(n))
      expect(bottom.length).toBeLessThanOrEqual(top.length)
    }
  })

  it('keeps the upstream bottom-right corner when the bottom row has no centre', () => {
    expect(freeForAllRows(seats(2))).toEqual({ bottom: ['a'], top: ['b'] })
    expect(freeForAllRows(seats(3))).toEqual({ bottom: ['a'], top: ['b', 'c'] })
    expect(freeForAllRows(seats(4))).toEqual({ bottom: ['b', 'a'], top: ['c', 'd'] })
    expect(freeForAllRows(seats(5))).toEqual({ bottom: ['b', 'a'], top: ['c', 'd', 'e'] })
    expect(freeForAllRows(seats(8))).toEqual({ bottom: ['d', 'c', 'b', 'a'], top: ['e', 'f', 'g', 'h'] })
  })
})
