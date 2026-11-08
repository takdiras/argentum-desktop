/**
 * Which battlefield layout to draw: upstream's `classic` rows, or the compact `arena` one.
 *
 * A desktop-only setting, so it deliberately lives in its own localStorage key and store rather
 * than in the shared preferences document — that document is synced to the account on the server,
 * which knows nothing about this field.
 */
import { create } from 'zustand'

export type BoardLayout = 'classic' | 'arena'

const STORAGE_KEY = 'argentum-desktop-board-layout'

function read(): BoardLayout {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'classic' ? 'classic' : 'arena'
  } catch {
    // Private mode / blocked storage: fall back to the default for this session.
    return 'arena'
  }
}

interface BoardLayoutState {
  layout: BoardLayout
  setLayout: (layout: BoardLayout) => void
}

export const useBoardLayout = create<BoardLayoutState>((set) => ({
  layout: read(),
  setLayout: (layout) => {
    try {
      localStorage.setItem(STORAGE_KEY, layout)
    } catch {
      // Not persisted this session; the choice still applies until reload.
    }
    set({ layout })
  },
}))

/** True when the compact arena layout is selected. */
export function useArenaLayout(): boolean {
  return useBoardLayout((s) => s.layout === 'arena')
}
