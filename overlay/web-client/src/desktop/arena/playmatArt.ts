/**
 * What a player's battlefield playmat shows, decided from the cards the client can see.
 *
 *   1. Commander      the owner's designated commander(s): their art, side by side when there are two.
 *   2. Deck           no commander (any other format): the art of the deck's marquee card — the
 *                     highest-mana-value non-land card of the owner's that the client has seen.
 *   3. Colours        nothing to take art from yet (an opponent who has shown no card): a wash of the
 *                     colours of what they have shown, or a neutral slate when even that is empty.
 *
 * Pure so it is unit-tested. The mat itself is `Playmat.tsx`; `usePlaymatArt` feeds it. The art is a
 * plain string (`encodePlaymatArt`) so a store selector can return it and React only re-renders when
 * the mat would actually change, not on every game-state update.
 */
import type { ClientCard } from '@/types'
import { getCdnArtCropUrl, getScryfallArtCropUrl } from '@/utils/cardImages.ts'

/** The mat is a backdrop, never a competitor for attention with the cards on it. */
export const PLAYMAT_OPACITY = 0.2

/** At most this many commanders share the mat (partners, Background, Doctor's companion). */
export const PLAYMAT_MAX_COMMANDERS = 2

export type PlaymatArt =
  | { kind: 'commander'; urls: readonly string[] }
  | { kind: 'deck'; url: string }
  | { kind: 'colors'; colors: readonly string[] }

/** Muted so a wash of them stays a tint rather than a colour block. */
const COLOR_HEX: Readonly<Record<string, string>> = {
  WHITE: '#e6dcae',
  BLUE: '#3f86c8',
  BLACK: '#7a6590',
  RED: '#d6533e',
  GREEN: '#41a35c',
}
const NEUTRAL_TOP = '#64748b'
const NEUTRAL_BOTTOM = '#334155'

/** Most colours the wash blends; a five-colour deck would otherwise read as mud. */
const MAX_WASH_COLORS = 3

/**
 * Whose battlefield this is. `playerId` is set for a multiplayer cell or a spectator's bottom seat;
 * left out, your side is you and the opponent side is the (first) other player — the 2-player shape.
 */
export function playmatOwnerId(
  players: readonly { readonly playerId: string }[],
  viewerId: string | null,
  isOpponent: boolean,
  playerId?: string | null,
): string | null {
  if (playerId) return playerId
  if (!isOpponent) return viewerId
  return players.find((p) => p.playerId !== viewerId)?.playerId ?? null
}

/** Landscape art for a card: the CDN crop of its own printing, else a by-name lookup. */
export function playmatImageUrl(card: Pick<ClientCard, 'name' | 'imageUri'>): string {
  return getCdnArtCropUrl(card.imageUri) ?? getScryfallArtCropUrl(card.name)
}

const isLand = (c: ClientCard) => c.cardTypes.includes('LAND')

/** A card whose art says something about the deck: real, face-up, and not a land. */
function isDeckIdentity(c: ClientCard): boolean {
  return !c.isToken && !c.isFaceDown && !isLand(c)
}

function marqueeCard(owned: readonly ClientCard[]): ClientCard | null {
  let best: ClientCard | null = null
  for (const c of owned) {
    if (!isDeckIdentity(c)) continue
    if (
      best === null ||
      c.manaValue > best.manaValue ||
      (c.manaValue === best.manaValue && c.name < best.name)
    ) {
      best = c
    }
  }
  return best
}

/** Lands are colourless, but their basic land types say what the deck makes. */
const LAND_SUBTYPE_COLOR: Readonly<Record<string, string>> = {
  Plains: 'WHITE',
  Island: 'BLUE',
  Swamp: 'BLACK',
  Mountain: 'RED',
  Forest: 'GREEN',
}

/**
 * Colours of what the owner has shown, most-represented first. By the time this runs the owner has
 * shown no spell (that would have given deck art), so it is the lands that carry the colour.
 */
function shownColors(owned: readonly ClientCard[]): string[] {
  const counts = new Map<string, number>()
  const add = (col: string) => counts.set(col, (counts.get(col) ?? 0) + 1)
  for (const c of owned) {
    if (c.isToken || c.isFaceDown) continue
    for (const col of c.colors) add(col)
    if (isLand(c)) {
      for (const sub of c.subtypes ?? []) {
        const col = LAND_SUBTYPE_COLOR[sub]
        if (col) add(col)
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_WASH_COLORS)
    .map(([color]) => color)
}

/** The mat for `ownerId`, from every card the client knows about (`gameState.cards`). */
export function playmatArtFor(cards: Iterable<ClientCard>, ownerId: string): PlaymatArt {
  const owned: ClientCard[] = []
  for (const c of cards) if (c.ownerId === ownerId) owned.push(c)

  // A token copy of a commander never carries the flag (CR 903.10a), so the flag alone is enough.
  const commanders = owned
    .filter((c) => c.isCommander)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, PLAYMAT_MAX_COMMANDERS)
  if (commanders.length > 0) return { kind: 'commander', urls: commanders.map(playmatImageUrl) }

  const marquee = marqueeCard(owned)
  if (marquee) return { kind: 'deck', url: playmatImageUrl(marquee) }

  return { kind: 'colors', colors: shownColors(owned) }
}

/** CSS background for a colour wash: the colours blended on a diagonal, or neutral slate. */
export function playmatWash(colors: readonly string[]): string {
  const hexes = colors.map((c) => COLOR_HEX[c]).filter((h): h is string => !!h)
  if (hexes.length === 0) return `linear-gradient(135deg, ${NEUTRAL_TOP}, ${NEUTRAL_BOTTOM})`
  if (hexes.length === 1) return `linear-gradient(135deg, ${hexes[0]}, ${hexes[0]}66)`
  return `linear-gradient(135deg, ${hexes.join(', ')})`
}

// Art as a string, so a selector can return it by value. Card image URLs never contain a space.
export function encodePlaymatArt(art: PlaymatArt): string {
  switch (art.kind) {
    case 'commander':
      return `commander ${art.urls.join(' ')}`
    case 'deck':
      return `deck ${art.url}`
    case 'colors':
      return `colors ${art.colors.join(' ')}`
  }
}

export function decodePlaymatArt(encoded: string): PlaymatArt {
  const [kind = '', ...rest] = encoded.split(' ')
  if (kind === 'commander') return { kind, urls: rest }
  if (kind === 'deck') return { kind, url: rest[0] ?? '' }
  return { kind: 'colors', colors: rest.filter(Boolean) }
}

/**
 * Keeps a deck mat from swapping as a pricier card shows up later in the game: once a deck image is
 * chosen for an owner it stays, until a commander appears or the owner changes.
 */
export function stickyPlaymatArt(
  fresh: string,
  ownerId: string | null,
  previous: { ownerId: string | null; art: string } | null,
): { ownerId: string | null; art: string } {
  const isDeck = fresh.startsWith('deck ')
  if (isDeck && previous && previous.ownerId === ownerId && previous.art.startsWith('deck ')) return previous
  return { ownerId, art: fresh }
}
