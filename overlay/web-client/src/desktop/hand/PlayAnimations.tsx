/**
 * A card that changes zone flies there, whoever's it is and wherever it goes: to its tile on a battlefield,
 * to the stack, into a hand, onto a graveyard, exile or library pile.
 *
 * It starts where the card was: under the cursor if you dragged it out of your hand and let go, otherwise its
 * slot in your hand, its tile on the field, its item on the stack, or the pile it left. It ends on the tile,
 * slot or pile it now has, whatever size the board gave it, and the real card takes over as the copy fades.
 * An ability — activated or triggered — flies to the stack as a copy from the permanent it came from.
 *
 * Moves are noticed by comparing where every card was before and after each state update. The store tells us
 * *before* React redraws, so the old DOM is still there to measure each card's starting place. Flights that
 * start together are staggered, so a board wipe ripples instead of leaving all at once.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore.ts'
import type { ClientCard, EntityId } from '@/types'
import { getCardImageUrl } from '@/utils/cardImages.ts'
import {
  HOLD_MAX_MS,
  PLAY_TARGET_WAIT_MS,
  isPlayDrop,
  isStackAbility,
  lerpBox,
  pickAbilitySource,
  pickOrigin,
  playProgress,
  type Box,
  type Drop,
} from './playFlight'
import {
  FLIGHT_MS,
  MAX_FLIGHTS_PER_UPDATE,
  animates,
  kindFor,
  locate,
  moves,
  scheduleStart,
  type FlightKind,
  type Loc,
} from './zoneFlights'

interface Flight {
  key: string
  cardId: string
  name: string
  imageUri: string | null
  origin: Box
  /** Where it is headed: a tile on a battlefield, a stack item, a hand slot, or a pile. */
  kind: FlightKind
  /** Selector of the pile it lands on (kind 'pile'). */
  pile: string | null
  /** When it leaves (ms epoch): flights that start together are staggered. Until then it waits at its origin. */
  startAt: number
}

/** A card you let go of, kept where it was dropped until the table shows what became of it. */
interface Held {
  cardId: string
  name: string
  imageUri: string | null
  x: number
  y: number
}

/** DraggedCardOverlay draws its ghost at this opacity; the flight starts from it, so nothing jumps. */
const GHOST_OPACITY = 0.8

const esc = (id: string): string => CSS.escape(id)

/** The piece of the table a pile-like zone is drawn as, for a card to fly from or to. */
function pileSelector(loc: Loc): string | null {
  const owner = loc.owner === null ? null : esc(loc.owner)
  switch (loc.zone) {
    case 'Graveyard':
      return owner ? `[data-graveyard-id="${owner}"]` : null
    case 'Exile':
      return owner ? `[data-exile-id="${owner}"]` : null
    case 'Library':
      return owner ? `[data-zone$="library"][data-zone-owner="${owner}"]` : null
    case 'Hand':
      // An opponent's hand: the one for that seat if the table labels it, else the one hand there is.
      return owner ? `[data-zone="opponent-hand"][data-zone-owner="${owner}"], [data-zone="opponent-hand"]` : null
    default:
      return null
  }
}

function visibleElement(el: Element | null): Element | null {
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 ? el : null
}

/** The element a card's flight lands on. */
function findTarget(f: Flight): Element | null {
  const id = esc(f.cardId)
  switch (f.kind) {
    case 'field':
      return document.querySelector(`[data-zone$="battlefield"] [data-card-id="${id}"]`)
    case 'hand':
      return document.querySelector(`[data-hand-card-id="${id}"]`)
    case 'pile':
      return f.pile ? visibleElement(document.querySelector(f.pile)) : null
    case 'stack':
      for (const el of document.querySelectorAll(`[data-card-id="${id}"]`)) {
        if (!el.closest('[data-zone="hand"], [data-zone$="battlefield"]')) return el
      }
      return null
  }
}

/** CSS that keeps the real card out of sight until its copy has landed on it (piles have no card to hide). */
function hideRule(f: Flight): string | null {
  const id = esc(f.cardId)
  switch (f.kind) {
    case 'field':
      return `[data-zone$="battlefield"] [data-card-id="${id}"]{visibility:hidden !important}`
    case 'hand':
      return `[data-hand-card-id="${id}"]{visibility:hidden !important}`
    case 'stack':
      return `[data-card-id="${id}"]{visibility:hidden !important}`
    case 'pile':
      return null
  }
}

const boxOf = (rect: DOMRect, rotation = 0): Box => ({
  cx: rect.left + rect.width / 2,
  cy: rect.top + rect.height / 2,
  w: rect.width,
  h: rect.height,
  rotation,
})

/** A hand slot as it is laid out: the card's own size and tilt, not the box around the tilted card. */
function handSlotBox(slot: HTMLElement): Box | null {
  const rect = slot.getBoundingClientRect()
  if (rect.width <= 0) return null
  const w = Number(slot.dataset.handWidth) || rect.width
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w, h: w * 1.4, rotation: Number(slot.dataset.handRotation) || 0 }
}

/** Where a card is on screen right now: its slot in your hand, and any other place it is drawn. */
function measure(cardId: string): { hand: Box | null; elsewhere: Box | null } {
  const slot = document.querySelector<HTMLElement>(`[data-hand-card-id="${esc(cardId)}"]`)
  const other = document.querySelector(`[data-card-id="${esc(cardId)}"]`)
  const otherRect = other?.getBoundingClientRect()
  return { hand: slot ? handSlotBox(slot) : null, elsewhere: otherRect && otherRect.width > 0 ? boxOf(otherRect) : null }
}

/** A pile (or an opponent's hand) as a place a card can leave from. */
function pileBox(loc: Loc): Box | null {
  const sel = pileSelector(loc)
  const el = sel ? visibleElement(document.querySelector(sel)) : null
  return el ? boxOf(el.getBoundingClientRect()) : null
}

function PlayFlight({ flight, onStart, onReveal, onDone }: { flight: Flight; onStart: () => void; onReveal: () => void; onDone: () => void }) {
  const [frame, setFrame] = useState<{ box: Box; opacity: number } | null>(null)

  useEffect(() => {
    let raf = 0
    let t0: number | null = null
    let revealed = false
    let started = false
    // It waits its turn at its origin (the card has already left the table), then goes.
    const begin = performance.now() + Math.max(0, flight.startAt - Date.now())
    const duration = FLIGHT_MS[flight.kind]
    const tick = () => {
      const now = performance.now()
      if (now < begin) {
        setFrame({ box: flight.origin, opacity: GHOST_OPACITY })
        if (!started) {
          started = true
          onStart()
        }
        raf = requestAnimationFrame(tick)
        return
      }
      const target = findTarget(flight)
      const rect = target?.getBoundingClientRect()
      if (!target || !rect || rect.width === 0) {
        // Nothing to land on (yet, or any more): wait a moment for it, then let the flight go.
        if (now - begin > PLAY_TARGET_WAIT_MS) return onDone()
        raf = requestAnimationFrame(tick)
        return
      }
      if (t0 === null) t0 = now
      const p = playProgress(now - t0, duration)
      // The target is read every frame: adding a permanent can resize the whole board under the flight.
      const dest = flight.kind === 'hand' ? (handSlotBox(target as HTMLElement) ?? boxOf(rect)) : boxOf(rect)
      setFrame({ box: lerpBox(flight.origin, dest, p.t), opacity: p.opacity * (GHOST_OPACITY + (1 - GHOST_OPACITY) * Math.min(1, p.t * 4)) })
      if (!started) {
        started = true
        onStart()
      }
      if (p.reveal && !revealed) {
        revealed = true
        onReveal()
      }
      if (p.done) return onDone()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // The callbacks close over stable setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight])

  if (!frame) return null
  const { box, opacity } = frame
  return (
    <div
      style={{
        position: 'fixed',
        left: box.cx - box.w / 2,
        top: box.cy - box.h / 2,
        width: box.w,
        height: box.h,
        transform: `rotate(${box.rotation}deg)`,
        opacity,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'none',
        zIndex: 'var(--z-animation)' as unknown as number,
      }}
    >
      <img
        src={getCardImageUrl(flight.name, flight.imageUri, 'normal')}
        alt={flight.name}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}

export function PlayAnimations() {
  const [flights, setFlights] = useState<readonly Flight[]>([])
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [held, setHeld] = useState<Held | null>(null)
  const heldRef = useRef<Held | null>(null)
  const hold = useCallback((h: Held | null) => {
    heldRef.current = h
    setHeld(h)
  }, [])

  useEffect(() => {
    let pointer = { x: 0, y: 0 }
    const onMouse = (e: MouseEvent) => (pointer = { x: e.clientX, y: e.clientY })
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) pointer = { x: t.clientX, y: t.clientY }
    }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })

    let drop: Drop | null = null
    let dragStart = { x: 0, y: 0 }
    let holdTimer = 0
    let locs = locate(useGameStore.getState().gameState?.zones ?? [])
    let nextSlot = 0
    let seq = 0

    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (!prev.draggingCardId && state.draggingCardId) dragStart = pointer
      // Letting go of a dragged card: remember where, in case it was played.
      if (prev.draggingCardId && !state.draggingCardId) {
        const id = prev.draggingCardId
        drop = { cardId: id, ...pointer, at: Date.now() }
        // The drag ghost vanishes the moment you let go, but the table only shows the card played after a
        // round trip to the server. Until then the card stays where it was dropped, so it never blinks out.
        const handTop = document.querySelector('[data-zone="hand"]')?.getBoundingClientRect().top ?? null
        const card = state.gameState?.cards[id]
        window.clearTimeout(holdTimer)
        if (card && !card.isFaceDown && isPlayDrop(dragStart, pointer, handTop)) {
          hold({ cardId: id, name: card.name, imageUri: card.imageUri ?? null, x: pointer.x, y: pointer.y })
          holdTimer = window.setTimeout(() => hold(null), HOLD_MAX_MS)
        }
      }
      // Choosing a target or a cost, or opening the cast menu, means the card is not going straight to the field.
      if (heldRef.current && (state.targetingState || state.pipelineState || state.selectedCardId)) hold(null)
      if (state.gameState === prev.gameState) return

      const gs = state.gameState
      const prevLocs = locs
      locs = gs ? locate(gs.zones) : new Map()
      if (!gs || !prev.gameState) return

      const viewer = gs.viewingPlayerId as string
      const now = Date.now()
      const started: Flight[] = []
      const add = (cardId: string, card: ClientCard, origin: Box | null, to: Loc) => {
        const kind = kindFor(to, viewer)
        if (!origin || !kind || started.length >= MAX_FLIGHTS_PER_UPDATE) return
        const slot = scheduleStart(now, nextSlot)
        nextSlot = slot.nextSlot
        started.push({
          key: `play-${cardId}-${seq++}`,
          cardId,
          name: card.name,
          imageUri: card.imageUri ?? null,
          origin,
          kind,
          pile: kind === 'pile' ? pileSelector(to) : null,
          startAt: slot.startAt,
        })
      }

      // A card that was somewhere and is now somewhere else.
      for (const m of moves(prevLocs, locs)) {
        const card = gs.cards[m.id as EntityId]
        if (!card || card.isFaceDown || !animates(m)) continue
        let origin: Box | null
        if (m.from.zone === 'Hand' && m.from.owner === viewer) origin = pickOrigin(m.id, now, { drop, ...measure(m.id) })
        else if (m.from.zone === 'Battlefield' || m.from.zone === 'Stack') origin = measure(m.id).elsewhere
        else origin = pileBox(m.from)
        add(m.id, card, origin, m.to)
      }

      // Cards with no place before: abilities that just went on the stack, and opponents' cards coming out of
      // zones we cannot see (their hand, their library).
      const sizeOf = (zones: typeof gs.zones, type: string, owner: string): number =>
        zones.find((z) => z.zoneId.zoneType === type && z.zoneId.ownerId === owner)?.size ?? 0
      let justTapped: Set<string> | null = null
      for (const [id, loc] of locs) {
        if (prevLocs.has(id)) continue
        const card = gs.cards[id as EntityId]
        if (!card || card.isFaceDown) continue
        if (loc.zone === 'Stack' && isStackAbility(card)) {
          // Permanents that tapped with this update: an activation's cost gives its source away.
          if (!justTapped) {
            justTapped = new Set<string>()
            for (const [cid, c] of Object.entries(gs.cards)) if (c.isTapped && prev.gameState.cards[cid as EntityId]?.isTapped === false) justTapped.add(cid)
          }
          const field: { id: string; name: string; controllerId: string }[] = []
          for (const [cid, at] of locs) {
            const c = gs.cards[cid as EntityId]
            if (at.zone === 'Battlefield' && c) field.push({ id: cid, name: c.name, controllerId: c.controllerId })
          }
          // Art-less abilities (the speed trigger) have no picture to fly.
          const sourceId = card.imageUri ? pickAbilitySource(field, card.name, card.controllerId, justTapped) : null
          add(id, card, sourceId ? measure(sourceId).elsewhere : null, loc)
          continue
        }
        // Their cards: from the hand or library that just got smaller (a token, or something of ours, has no such origin).
        const theirs = loc.zone === 'Battlefield' || loc.zone === 'Stack' ? card.controllerId !== viewer : card.ownerId !== viewer
        if (!theirs || card.isToken || !['Battlefield', 'Stack', 'Graveyard', 'Exile'].includes(loc.zone)) continue
        const owner = card.ownerId as string
        const fromZone = sizeOf(gs.zones, 'Hand', owner) < sizeOf(prev.gameState.zones, 'Hand', owner) ? 'Hand' : sizeOf(gs.zones, 'Library', owner) < sizeOf(prev.gameState.zones, 'Library', owner) ? 'Library' : null
        if (fromZone) add(id, card, pileBox({ zone: fromZone, owner }), loc)
      }

      // A held card that left your hand without a flight of its own went somewhere with nothing to show: let go of it.
      const heldNow = heldRef.current
      if (heldNow) {
        const at = locs.get(heldNow.cardId)
        const stillInHand = at !== undefined && at.zone === 'Hand' && at.owner === viewer
        if (!stillInHand && !started.some((f) => f.cardId === heldNow.cardId)) hold(null)
      }
      if (started.length > 0) setFlights((f) => [...f, ...started])
    })

    return () => {
      window.clearTimeout(holdTimer)
      unsubscribe()
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [hold])

  const reveal = useCallback((key: string) => setRevealed((r) => new Set(r).add(key)), [])
  const finish = useCallback((key: string) => {
    setFlights((f) => f.filter((x) => x.key !== key))
    setRevealed((r) => {
      const next = new Set(r)
      next.delete(key)
      return next
    })
  }, [])

  const ghost = held && (
    <div
      style={{
        position: 'fixed',
        left: held.x - 40,
        top: held.y - 56,
        width: 80,
        height: 112,
        pointerEvents: 'none',
        zIndex: 2000,
        opacity: GHOST_OPACITY,
        transform: 'rotate(-5deg) scale(1.1)',
      }}
    >
      <img
        src={getCardImageUrl(held.name, held.imageUri, 'normal')}
        alt={held.name}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 221, 255, 0.4)',
        }}
      />
    </div>
  )
  if (flights.length === 0) return ghost || null
  // The real card stays hidden on the field until its copy has landed on it.
  const hidden = flights.filter((f) => !revealed.has(f.key))

  return (
    <>
      {hidden.length > 0 && (
        <style>
          {hidden.map(hideRule).filter(Boolean).join('\n')}
        </style>
      )}
      {ghost}
      {flights.map((f) => (
        <PlayFlight
          key={f.key}
          flight={f}
          // The flight starts exactly where the held card is, so the held copy gives way to it.
          onStart={() => {
            if (heldRef.current?.cardId === f.cardId) hold(null)
          }}
          onReveal={() => reveal(f.key)}
          onDone={() => finish(f.key)}
        />
      ))}
    </>
  )
}
