import { describe, expect, it } from 'vitest'
import { WAITING_SHOW_DELAY_MS, isWaitingOnPlayer, type WaitContext } from './waitingOn'

const ME = 'me'
const OPP = 'opp'
const ctx = (over: Partial<WaitContext> = {}): WaitContext => ({
  viewingPlayerId: ME,
  priorityPlayerId: ME,
  hasOwnDecision: false,
  decidingPlayerId: null,
  gameOver: false,
  spectating: false,
  ...over,
})

describe('isWaitingOnPlayer', () => {
  it('waits on the opponent while they hold priority', () => {
    expect(isWaitingOnPlayer(OPP, ctx({ priorityPlayerId: OPP }))).toBe(true)
  })

  it('does not wait on the opponent while you hold priority', () => {
    expect(isWaitingOnPlayer(OPP, ctx({ priorityPlayerId: ME }))).toBe(false)
  })

  it('waits on whoever the server says is deciding, even without priority', () => {
    expect(isWaitingOnPlayer(OPP, ctx({ priorityPlayerId: ME, decidingPlayerId: OPP }))).toBe(true)
  })

  it('does not wait on the opponent when you have a decision of your own on screen', () => {
    expect(isWaitingOnPlayer(OPP, ctx({ priorityPlayerId: OPP, hasOwnDecision: true }))).toBe(false)
  })

  it('never waits on yourself', () => {
    expect(isWaitingOnPlayer(ME, ctx({ priorityPlayerId: ME }))).toBe(false)
    expect(isWaitingOnPlayer(ME, ctx({ decidingPlayerId: ME }))).toBe(false)
  })

  it('stops once the game is over, and never applies to spectators', () => {
    expect(isWaitingOnPlayer(OPP, ctx({ priorityPlayerId: OPP, gameOver: true }))).toBe(false)
    expect(isWaitingOnPlayer(OPP, ctx({ priorityPlayerId: OPP, spectating: true }))).toBe(false)
  })

  it('picks the one seat in a pod, not all of them', () => {
    const c = ctx({ priorityPlayerId: 'p3' })
    expect(isWaitingOnPlayer('p2', c)).toBe(false)
    expect(isWaitingOnPlayer('p3', c)).toBe(true)
  })
})

describe('WAITING_SHOW_DELAY_MS', () => {
  it('is long enough to swallow an instant pass and short enough to feel responsive', () => {
    expect(WAITING_SHOW_DELAY_MS).toBeGreaterThanOrEqual(300)
    expect(WAITING_SHOW_DELAY_MS).toBeLessThanOrEqual(1500)
  })
})
