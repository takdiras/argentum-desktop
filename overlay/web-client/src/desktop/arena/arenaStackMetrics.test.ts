import { describe, expect, it } from 'vitest'
import { ARENA_STACK_Z } from './arenaStackMetrics'

describe('ARENA_STACK_Z', () => {
  it('is above the seat name plates (55-57) and the active-yields panel (60), so nothing paints over the stack', () => {
    expect(ARENA_STACK_Z).toBeGreaterThan(60)
  })

  it('stays below the pass button and controls (100), so those are never hidden by it', () => {
    expect(ARENA_STACK_Z).toBeLessThan(100)
  })
})
