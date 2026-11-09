/**
 * Which side the stack panel sits on. A desktop-only setting kept in its own localStorage key, like the board
 * layout: the shared preferences document is synced to the account, which knows nothing about this field.
 */
import { create } from 'zustand'
import { parseStackSide, type StackSide } from './stackSide'

const STORAGE_KEY = 'argentum-desktop-stack-side'

function read(): StackSide {
  try {
    return parseStackSide(localStorage.getItem(STORAGE_KEY))
  } catch {
    // Private mode / blocked storage: use the default for this session.
    return parseStackSide(null)
  }
}

interface StackSideState {
  side: StackSide
  setSide: (side: StackSide) => void
}

export const useStackSide = create<StackSideState>((set) => ({
  side: read(),
  setSide: (side) => {
    try {
      localStorage.setItem(STORAGE_KEY, side)
    } catch {
      // Not persisted this session; the choice still applies until reload.
    }
    set({ side })
  },
}))
