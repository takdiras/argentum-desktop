/**
 * How much combat damage each defender (a player, a planeswalker or a battle) is about to take from the declared
 * attackers, shown as a small negative number beside it. Pure: the component feeds it what the store holds.
 *
 * It only reads what the server already exposes (power after pump effects, who is blocked, and the combat damage
 * assignments once the server has made them) and does not decide combat rules. Where the number cannot be known yet it
 * says so instead of guessing: a blocked attacker with trample contributes nothing until the server assigns its
 * damage, and the total then reads as "at least".
 */
import type { ClientCard, ClientCombatState, EntityId } from '@/types'
import { Keyword, Step, ZoneType } from '@/types'

/** One declared attacker, reduced to what the sum needs. */
export interface DamageAttacker {
  attackerId: EntityId
  /** The player, planeswalker or battle it attacks. */
  targetId: EntityId
  /** Power as the server projects it (after pump effects); 0 when it has none or is negative. */
  power: number
  /** At least one creature blocks it (or the server says it is blocked). */
  blocked: boolean
  /** A blocked attacker with trample can still push damage through, which only the server's assignment tells. */
  tramples: boolean
  /** Damage the server assigned to the target, when it has assigned this attacker's damage; else null. */
  assignedToTarget: number | null
}

/** What one defender is about to take. */
export interface IncomingDamage {
  targetId: EntityId
  amount: number
  /** True when some blocked trampler has not had its damage assigned yet, so the real figure may be higher. */
  atLeast: boolean
}

/** Sums each attacker's contribution per defender: unblocked adds its power, blocked adds what the server assigned. */
export function incomingDamageByTarget(attackers: readonly DamageAttacker[]): IncomingDamage[] {
  const totals = new Map<EntityId, IncomingDamage>()
  for (const a of attackers) {
    const entry = totals.get(a.targetId) ?? { targetId: a.targetId, amount: 0, atLeast: false }
    if (!a.blocked) {
      entry.amount += a.power
    } else if (a.assignedToTarget != null) {
      entry.amount += a.assignedToTarget
    } else if (a.tramples) {
      entry.atLeast = true
    }
    totals.set(a.targetId, entry)
  }
  // A defender whose attackers were all stopped has nothing to show.
  return [...totals.values()].filter((d) => d.amount > 0 || d.atLeast)
}

/** "-3", or "-3+" while a trampler's excess is not known yet. */
export function formatIncomingDamage(d: IncomingDamage): string {
  return `-${d.amount}${d.atLeast ? '+' : ''}`
}

/** Declaring attackers and blockers are the only steps where the damage is still ahead (it has landed after). */
const SHOWN_STEPS: ReadonlySet<string> = new Set([Step.DECLARE_ATTACKERS, Step.DECLARE_BLOCKERS])

interface Declared {
  id: EntityId
  targetId: EntityId
  assigned: number | null
}

/** The slice of the store's combat data the collector reads. */
export interface DamageSources {
  step: string | undefined
  /** `gameState.combat`: the declared attackers and blockers the server sent. */
  combat: ClientCombatState | null | undefined
  /** The local declaration in progress (`combatState`), if any. */
  local:
    | {
        mode: 'declareAttackers' | 'declareBlockers'
        selectedAttackers: readonly EntityId[]
        attackerTargets: Readonly<Record<EntityId, EntityId>>
        /** Where an attacker with no explicit target goes (the sticky or sole defender); null when unknown. */
        defaultDefenderId: EntityId | null
        blockerAssignments: Readonly<Record<EntityId, readonly EntityId[]>>
        proposedBlockerAssignments?: Readonly<Record<EntityId, readonly EntityId[]>> | undefined
      }
    | null
  /** The attacking player's streamed selection, seen by the defender while it is being made. */
  opponentAttackers: {
    selectedAttackers: readonly EntityId[]
    attackerTargets: Readonly<Record<EntityId, EntityId>>
  } | null
  /** The defender's streamed blocks, seen by the attacker while they are being made. */
  opponentBlocks: Readonly<Record<EntityId, readonly EntityId[]>> | null
  cards: Readonly<Record<EntityId, ClientCard | undefined>> | null | undefined
}

function onBattlefield(card: ClientCard | undefined): card is ClientCard {
  return card?.zone?.zoneType === ZoneType.BATTLEFIELD
}

/** Attackers (and where they point) from the most authoritative source available. */
function declaredAttackers(src: DamageSources): Declared[] {
  const { combat, local, opponentAttackers } = src
  if (combat && combat.attackers.length > 0) {
    return combat.attackers.map((a) => {
      const targetId = a.attackingTarget.type === 'Player' ? a.attackingTarget.playerId : a.attackingTarget.permanentId
      return { id: a.creatureId, targetId, assigned: a.damageAssignments ? (a.damageAssignments[targetId] ?? 0) : null }
    })
  }
  if (local?.mode === 'declareAttackers') {
    const out: Declared[] = []
    for (const id of local.selectedAttackers) {
      const targetId = local.attackerTargets[id] ?? local.defaultDefenderId
      if (targetId) out.push({ id, targetId, assigned: null })
    }
    return out
  }
  if (opponentAttackers && src.step === Step.DECLARE_ATTACKERS) {
    const out: Declared[] = []
    for (const id of opponentAttackers.selectedAttackers) {
      const targetId = opponentAttackers.attackerTargets[id]
      if (targetId) out.push({ id, targetId, assigned: null })
    }
    return out
  }
  return []
}

/** Attackers that are blocked: by the server's word, or by blocks still being assigned on this side or the other. */
function blockedAttackers(src: DamageSources): Set<EntityId> {
  const blocked = new Set<EntityId>()
  for (const a of src.combat?.attackers ?? []) {
    if (a.isBlocked || a.blockedBy.length > 0) blocked.add(a.creatureId)
  }
  for (const b of src.combat?.blockers ?? []) blocked.add(b.blockingAttacker)
  if (src.local?.mode === 'declareBlockers') {
    const all = { ...src.local.proposedBlockerAssignments, ...src.local.blockerAssignments }
    for (const attackerIds of Object.values(all)) for (const id of attackerIds) blocked.add(id)
  }
  if (src.step === Step.DECLARE_BLOCKERS && src.opponentBlocks) {
    for (const attackerIds of Object.values(src.opponentBlocks)) for (const id of attackerIds) blocked.add(id)
  }
  return blocked
}

/** The attackers to sum for the current moment of combat; empty outside declare attackers / declare blockers. */
export function collectDamageAttackers(src: DamageSources): DamageAttacker[] {
  if (!src.step || !SHOWN_STEPS.has(src.step)) return []
  const blocked = blockedAttackers(src)
  const out: DamageAttacker[] = []
  for (const { id, targetId, assigned } of declaredAttackers(src)) {
    const card = src.cards?.[id]
    if (!onBattlefield(card)) continue
    const isBlocked = blocked.has(id)
    out.push({
      attackerId: id,
      targetId,
      power: Math.max(0, card.power ?? 0),
      blocked: isBlocked,
      tramples: card.keywords.includes(Keyword.TRAMPLE),
      // An assignment only means something for a blocked attacker; an unblocked one deals its power.
      assignedToTarget: isBlocked ? assigned : null,
    })
  }
  return out
}

/** Sources in, per-defender totals out. */
export function computeIncomingDamage(src: DamageSources): IncomingDamage[] {
  return incomingDamageByTarget(collectDamageAttackers(src))
}
