import { describe, expect, it } from 'vitest'
import type { ClientCard, ClientCombatState, EntityId } from '@/types'
import { Keyword, Step, ZoneType } from '@/types'
import {
  collectDamageAttackers,
  computeIncomingDamage,
  formatIncomingDamage,
  incomingDamageByTarget,
  type DamageAttacker,
  type DamageSources,
} from './incomingDamage'

const id = (s: string) => s as EntityId

function attacker(over: Omit<Partial<DamageAttacker>, 'attackerId'> & { attackerId: string }): DamageAttacker {
  return {
    targetId: id('bob'),
    power: 2,
    blocked: false,
    tramples: false,
    assignedToTarget: null,
    ...over,
    attackerId: id(over.attackerId),
  }
}

describe('incomingDamageByTarget', () => {
  it('adds the power of every unblocked attacker', () => {
    const out = incomingDamageByTarget([attacker({ attackerId: 'a', power: 2 }), attacker({ attackerId: 'b', power: 3 })])
    expect(out).toEqual([{ targetId: id('bob'), amount: 5, atLeast: false }])
  })

  it('counts a fully blocked attacker as nothing and drops the defender when nothing is left', () => {
    expect(incomingDamageByTarget([attacker({ attackerId: 'a', blocked: true })])).toEqual([])
  })

  it('lowers the total by exactly the blocked attacker', () => {
    const open = [attacker({ attackerId: 'a', power: 2 }), attacker({ attackerId: 'b', power: 3 })]
    const afterBlock = [attacker({ attackerId: 'a', power: 2, blocked: true }), open[1]!]
    expect(incomingDamageByTarget(open)[0]?.amount).toBe(5)
    expect(incomingDamageByTarget(afterBlock)[0]?.amount).toBe(3)
  })

  it('keeps defenders apart: players and planeswalkers each get their own total', () => {
    const out = incomingDamageByTarget([
      attacker({ attackerId: 'a', power: 2, targetId: id('bob') }),
      attacker({ attackerId: 'b', power: 4, targetId: id('walker') }),
      attacker({ attackerId: 'c', power: 1, targetId: id('walker') }),
    ])
    expect(out).toEqual([
      { targetId: id('bob'), amount: 2, atLeast: false },
      { targetId: id('walker'), amount: 5, atLeast: false },
    ])
  })

  it('uses what the server assigned to the defender for a blocked attacker', () => {
    const out = incomingDamageByTarget([attacker({ attackerId: 'a', power: 5, blocked: true, tramples: true, assignedToTarget: 3 })])
    expect(out).toEqual([{ targetId: id('bob'), amount: 3, atLeast: false }])
  })

  it('reads a blocked trampler as "at least" until the server has assigned its damage', () => {
    const out = incomingDamageByTarget([
      attacker({ attackerId: 'a', power: 5, blocked: true, tramples: true }),
      attacker({ attackerId: 'b', power: 1 }),
    ])
    expect(out).toEqual([{ targetId: id('bob'), amount: 1, atLeast: true }])
  })

  it('never lets a blocked non-trampler through, assignment or not', () => {
    expect(incomingDamageByTarget([attacker({ attackerId: 'a', blocked: true, assignedToTarget: null })])).toEqual([])
  })
})

describe('formatIncomingDamage', () => {
  it('prints a negative number', () => {
    expect(formatIncomingDamage({ targetId: id('bob'), amount: 2, atLeast: false })).toBe('-2')
  })
  it('marks an open-ended total with a plus', () => {
    expect(formatIncomingDamage({ targetId: id('bob'), amount: 2, atLeast: true })).toBe('-2+')
  })
})

function card(over: Omit<Partial<ClientCard>, 'id'> & { id: string }): ClientCard {
  return {
    name: over.id,
    power: 2,
    toughness: 2,
    keywords: [],
    zone: { zoneType: ZoneType.BATTLEFIELD },
    ...over,
    id: id(over.id),
  } as unknown as ClientCard
}

function combat(
  attackers: { id: string; target: string; isBlocked?: boolean; blockedBy?: string[]; damageAssignments?: Record<string, number> }[],
  blockers: { id: string; blocking: string }[] = [],
): ClientCombatState {
  return {
    attackingPlayerId: id('alice'),
    defendingPlayerId: id('bob'),
    attackers: attackers.map((a) => ({
      creatureId: id(a.id),
      creatureName: a.id,
      attackingTarget: { type: 'Player', playerId: id(a.target) },
      blockedBy: (a.blockedBy ?? []).map(id),
      ...(a.isBlocked !== undefined ? { isBlocked: a.isBlocked } : {}),
      ...(a.damageAssignments ? { damageAssignments: a.damageAssignments as Record<EntityId, number> } : {}),
    })),
    blockers: blockers.map((b) => ({ creatureId: id(b.id), creatureName: b.id, blockingAttacker: id(b.blocking) })),
  } as unknown as ClientCombatState
}

function sources(over: Partial<DamageSources>): DamageSources {
  return {
    step: Step.DECLARE_BLOCKERS,
    combat: null,
    local: null,
    opponentAttackers: null,
    opponentBlocks: null,
    cards: {},
    ...over,
  }
}

const cards = {
  [id('a')]: card({ id: 'a', power: 2 }),
  [id('b')]: card({ id: 'b', power: 3 }),
  [id('t')]: card({ id: 't', power: 6, keywords: [Keyword.TRAMPLE] }),
}

describe('collectDamageAttackers / computeIncomingDamage', () => {
  it('shows the full power while the attack has not been blocked', () => {
    const out = computeIncomingDamage(
      sources({ cards, combat: combat([{ id: 'a', target: 'bob' }, { id: 'b', target: 'bob' }]) }),
    )
    expect(out).toEqual([{ targetId: id('bob'), amount: 5, atLeast: false }])
  })

  it('uses a pumped power (the projected value the server sends)', () => {
    const pumped = { ...cards, [id('a')]: card({ id: 'a', power: 5 }) }
    const out = computeIncomingDamage(sources({ cards: pumped, combat: combat([{ id: 'a', target: 'bob' }]) }))
    expect(out[0]?.amount).toBe(5)
  })

  it('drops a block as the defender assigns it locally, before it is declared', () => {
    const local = {
      mode: 'declareBlockers' as const,
      selectedAttackers: [],
      attackerTargets: {},
      defaultDefenderId: null,
      blockerAssignments: { [id('x')]: [id('a')] },
    }
    const out = computeIncomingDamage(
      sources({ cards, local, combat: combat([{ id: 'a', target: 'bob' }, { id: 'b', target: 'bob' }]) }),
    )
    expect(out).toEqual([{ targetId: id('bob'), amount: 3, atLeast: false }])
  })

  it('counts team-proposed blocks the same as your own', () => {
    const local = {
      mode: 'declareBlockers' as const,
      selectedAttackers: [],
      attackerTargets: {},
      defaultDefenderId: null,
      blockerAssignments: {},
      proposedBlockerAssignments: { [id('x')]: [id('b')] },
    }
    const out = computeIncomingDamage(
      sources({ cards, local, combat: combat([{ id: 'a', target: 'bob' }, { id: 'b', target: 'bob' }]) }),
    )
    expect(out[0]?.amount).toBe(2)
  })

  it("follows the defender's streamed blocks on the attacker's side, only while blocks are being declared", () => {
    const base = { cards, combat: combat([{ id: 'a', target: 'bob' }, { id: 'b', target: 'bob' }]) }
    const streamed = { [id('x')]: [id('b')] }
    expect(computeIncomingDamage(sources({ ...base, opponentBlocks: streamed }))[0]?.amount).toBe(2)
    expect(computeIncomingDamage(sources({ ...base, step: Step.DECLARE_ATTACKERS, opponentBlocks: streamed }))[0]?.amount).toBe(5)
  })

  it("uses the server's blocks once declared, including an attacker that is blocked with no blocker left", () => {
    const out = computeIncomingDamage(
      sources({
        cards,
        combat: combat(
          [{ id: 'a', target: 'bob', blockedBy: ['x'] }, { id: 'b', target: 'bob', isBlocked: true }],
          [{ id: 'x', blocking: 'a' }],
        ),
      }),
    )
    expect(out).toEqual([])
  })

  it('sums the planeswalker and the player separately', () => {
    const c = combat([{ id: 'a', target: 'bob' }, { id: 'b', target: 'bob' }])
    // Re-aim b at a planeswalker.
    ;(c.attackers[1] as { attackingTarget: unknown }).attackingTarget = { type: 'Planeswalker', permanentId: id('walker') }
    const out = computeIncomingDamage(sources({ cards, combat: c }))
    expect(out).toEqual([
      { targetId: id('bob'), amount: 2, atLeast: false },
      { targetId: id('walker'), amount: 3, atLeast: false },
    ])
  })

  it('reads a blocked trampler as at least until the server assigns, then as the assigned amount', () => {
    const blocked = (damageAssignments?: Record<string, number>) =>
      sources({
        cards,
        combat: combat(
          [{ id: 't', target: 'bob', blockedBy: ['x'], ...(damageAssignments ? { damageAssignments } : {}) }],
          [{ id: 'x', blocking: 't' }],
        ),
      })
    expect(computeIncomingDamage(blocked())).toEqual([{ targetId: id('bob'), amount: 0, atLeast: true }])
    expect(computeIncomingDamage(blocked({ x: 2, bob: 4 }))).toEqual([{ targetId: id('bob'), amount: 4, atLeast: false }])
  })

  it('previews a declaration in progress, defaulting an unaimed attacker to the sole defender', () => {
    const local = {
      mode: 'declareAttackers' as const,
      selectedAttackers: [id('a'), id('b')],
      attackerTargets: { [id('b')]: id('walker') },
      defaultDefenderId: id('bob'),
      blockerAssignments: {},
    }
    const out = computeIncomingDamage(sources({ step: Step.DECLARE_ATTACKERS, cards, local }))
    expect(out).toEqual([
      { targetId: id('bob'), amount: 2, atLeast: false },
      { targetId: id('walker'), amount: 3, atLeast: false },
    ])
  })

  it("skips an attacker with no known target rather than guessing one", () => {
    const local = {
      mode: 'declareAttackers' as const,
      selectedAttackers: [id('a')],
      attackerTargets: {},
      defaultDefenderId: null,
      blockerAssignments: {},
    }
    expect(computeIncomingDamage(sources({ step: Step.DECLARE_ATTACKERS, cards, local }))).toEqual([])
  })

  it("shows the defender the attacker's streamed selection", () => {
    const out = computeIncomingDamage(
      sources({
        step: Step.DECLARE_ATTACKERS,
        cards,
        opponentAttackers: { selectedAttackers: [id('b')], attackerTargets: { [id('b')]: id('bob') } },
      }),
    )
    expect(out).toEqual([{ targetId: id('bob'), amount: 3, atLeast: false }])
  })

  it('clears once combat damage is being dealt or combat has ended', () => {
    const base = { cards, combat: combat([{ id: 'a', target: 'bob' }]) }
    for (const step of [Step.FIRST_STRIKE_COMBAT_DAMAGE, Step.COMBAT_DAMAGE, Step.END_COMBAT, Step.POSTCOMBAT_MAIN]) {
      expect(collectDamageAttackers(sources({ ...base, step }))).toEqual([])
    }
    expect(collectDamageAttackers(sources({ ...base, step: undefined }))).toEqual([])
  })

  it('ignores an attacker that has left the battlefield', () => {
    const gone = { ...cards, [id('a')]: card({ id: 'a', zone: { zoneType: ZoneType.GRAVEYARD } as never }) }
    expect(computeIncomingDamage(sources({ cards: gone, combat: combat([{ id: 'a', target: 'bob' }]) }))).toEqual([])
  })

  it('treats a missing or negative power as nothing', () => {
    const odd = {
      [id('a')]: card({ id: 'a', power: null }),
      [id('b')]: card({ id: 'b', power: -2 }),
    }
    expect(
      computeIncomingDamage(sources({ cards: odd, combat: combat([{ id: 'a', target: 'bob' }, { id: 'b', target: 'bob' }]) })),
    ).toEqual([])
  })
})
