/** Whose battlefield an arena board is (see `playmatOwnerId`), as a store subscription. */
import { useGameStore } from '@/store/gameStore.ts'
import { selectViewingPlayerId } from '@/store/selectors.ts'
import type { EntityId } from '@/types'
import { playmatOwnerId } from './playmatArt'

export function useBoardOwnerId(isOpponent: boolean, playerId?: string | undefined): EntityId | null {
  const viewerId = useGameStore(selectViewingPlayerId)
  // The id is read from the game state's players (or is the viewer / an explicit seat), so it is an
  // EntityId even though `playmatOwnerId` is typed over plain strings to stay easy to unit test.
  return useGameStore((s) =>
    s.gameState ? (playmatOwnerId(s.gameState.players, viewerId, isOpponent, playerId) as EntityId | null) : null,
  )
}
