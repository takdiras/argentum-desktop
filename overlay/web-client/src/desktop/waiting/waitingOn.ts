/**
 * "Are we waiting on this player?" — the rule behind the loading indicator on an opponent's name.
 *
 * Pure (no store, no React) so it is unit-testable. You are waiting on a player when the game is
 * stuck on them, which is one of two things:
 *  - the server says they are making a decision (a target, a choice, a block…), or
 *  - they hold priority and you have nothing of your own to answer.
 * Never for yourself, never once the game is over, and never when spectating (nobody is "waiting").
 */
export interface WaitContext {
  viewingPlayerId: string
  priorityPlayerId: string | null
  /** The viewer has a decision of their own on screen, so the game is waiting on *them*. */
  hasOwnDecision: boolean
  /** The seat the server reports as deciding right now, if any. */
  decidingPlayerId: string | null
  gameOver: boolean
  spectating: boolean
}

export function isWaitingOnPlayer(playerId: string, w: WaitContext): boolean {
  if (w.spectating || w.gameOver) return false
  if (playerId === w.viewingPlayerId) return false
  if (w.decidingPlayerId === playerId) return true
  if (w.hasOwnDecision) return false
  return w.priorityPlayerId === playerId
}

/** How long a wait must last before it is shown. A fast pass shouldn't make the spinner flicker. */
export const WAITING_SHOW_DELAY_MS = 700
