/**
 * The order you gave your hand, by card id. Kept in memory only: card ids belong to one game, so there is
 * nothing worth saving, and it never goes to the server.
 */
import { create } from 'zustand'

interface HandOrderState {
  order: readonly string[]
  setOrder: (order: readonly string[]) => void
}

export const useHandOrderStore = create<HandOrderState>((set) => ({
  order: [],
  setOrder: (order) => set({ order }),
}))
