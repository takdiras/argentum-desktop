import { describe, expect, it } from 'vitest'
import type { ClientCard } from '@/types'
import {
  decodePlaymatArt,
  encodePlaymatArt,
  playmatArtFor,
  playmatImageUrl,
  playmatOwnerId,
  playmatWash,
  stickyPlaymatArt,
} from './playmatArt'

const CDN = 'https://cards.scryfall.io/normal/front/a/b/abc.jpg'
const CDN_CROP = 'https://cards.scryfall.io/art_crop/front/a/b/abc.jpg'

function card(over: Partial<Record<keyof ClientCard, unknown>> & { name: string }): ClientCard {
  return {
    id: over.name,
    ownerId: 'me',
    manaValue: 2,
    cardTypes: ['CREATURE'],
    colors: [],
    isToken: false,
    isFaceDown: false,
    imageUri: null,
    ...over,
  } as unknown as ClientCard
}

describe('playmatOwnerId', () => {
  const players = [{ playerId: 'me' }, { playerId: 'them' }]
  it('uses an explicit seat when one is given', () => {
    expect(playmatOwnerId(players, 'me', true, 'seat3')).toBe('seat3')
  })
  it('is you on your side and the other player on the opponent side', () => {
    expect(playmatOwnerId(players, 'me', false)).toBe('me')
    expect(playmatOwnerId(players, 'me', true)).toBe('them')
  })
  it('is nobody before the game has players', () => {
    expect(playmatOwnerId([], null, true)).toBeNull()
  })
})

describe('playmatImageUrl', () => {
  it('derives the art crop from the card image on the Scryfall CDN', () => {
    expect(playmatImageUrl({ name: 'X', imageUri: CDN })).toBe(CDN_CROP)
  })
  it('looks the art up by name without a CDN image', () => {
    expect(playmatImageUrl({ name: 'Sol Ring', imageUri: null })).toContain('exact=Sol%20Ring')
    expect(playmatImageUrl({ name: 'Sol Ring', imageUri: null })).toContain('version=art_crop')
  })
})

describe('playmatArtFor', () => {
  it('prefers the commander, wherever it is', () => {
    const art = playmatArtFor(
      [card({ name: 'Bomb', manaValue: 9 }), card({ name: 'Boss', isCommander: true, imageUri: CDN })],
      'me',
    )
    expect(art).toEqual({ kind: 'commander', urls: [CDN_CROP] })
  })

  it('shows both partners, by name, and no more than two', () => {
    const art = playmatArtFor(
      ['C', 'A', 'B'].map((name) => card({ name, isCommander: true })),
      'me',
    )
    expect(art.kind).toBe('commander')
    expect(art.kind === 'commander' && art.urls).toHaveLength(2)
  })

  it("ignores another player's commander", () => {
    const art = playmatArtFor([card({ name: 'Theirs', ownerId: 'them', isCommander: true })], 'me')
    expect(art.kind).toBe('colors')
  })

  it('falls back to the marquee card of the deck outside Commander', () => {
    const art = playmatArtFor(
      [
        card({ name: 'Bear', manaValue: 2 }),
        card({ name: 'Dragon', manaValue: 6, imageUri: CDN }),
        card({ name: 'Mountain', manaValue: 0, cardTypes: ['LAND'] }),
        card({ name: 'Big Land', manaValue: 9, cardTypes: ['LAND'] }),
        card({ name: 'Big Token', manaValue: 9, isToken: true }),
        card({ name: 'Face Down', manaValue: 9, isFaceDown: true }),
      ],
      'me',
    )
    expect(art).toEqual({ kind: 'deck', url: CDN_CROP })
  })

  it('breaks mana-value ties by name so the pick is stable', () => {
    const cards = [card({ name: 'Zed', manaValue: 4 }), card({ name: 'Abe', manaValue: 4 })]
    const art = playmatArtFor(cards, 'me')
    expect(art).toEqual(playmatArtFor([...cards].reverse(), 'me'))
    expect(art.kind === 'deck' && art.url).toContain('Abe')
  })

  it('has no colours to wash in when nothing has been shown', () => {
    const art = playmatArtFor(
      [card({ name: 'Token', isToken: true, colors: ['RED' as never] }), card({ name: 'Wasteland', cardTypes: ['LAND'] })],
      'me',
    )
    expect(art).toEqual({ kind: 'colors', colors: [] })
  })

  it('washes in the colours of the basic land types shown, most first', () => {
    const land = (name: string, subtypes: string[]) => card({ name, cardTypes: ['LAND'], subtypes })
    const art = playmatArtFor(
      [land('Island', ['Island']), land('Island 2', ['Island']), land('Forest', ['Forest']), land('Swamp', ['Swamp']), land('Mountain', ['Mountain'])],
      'me',
    )
    // Four colours shown, three kept: the two Islands first, then ties by name.
    expect(art).toEqual({ kind: 'colors', colors: ['BLUE', 'BLACK', 'GREEN'] })
  })
})

describe('playmatWash', () => {
  it('is neutral with no colours and ignores unknown ones', () => {
    expect(playmatWash([])).toContain('#64748b')
    expect(playmatWash(['PURPLE'])).toContain('#64748b')
  })
  it('blends every colour it is given', () => {
    const wash = playmatWash(['RED', 'GREEN'])
    expect(wash).toContain('#d6533e')
    expect(wash).toContain('#41a35c')
  })
})

describe('encode / decode', () => {
  it.each([
    { kind: 'commander', urls: ['https://x/a.jpg', 'https://x/b.jpg'] },
    { kind: 'deck', url: 'https://x/a.jpg' },
    { kind: 'colors', colors: ['RED', 'BLUE'] },
    { kind: 'colors', colors: [] },
  ] as const)('round-trips %j', (art) => {
    expect(decodePlaymatArt(encodePlaymatArt(art))).toEqual(art)
  })
})

describe('stickyPlaymatArt', () => {
  const first = { ownerId: 'me', art: 'deck https://x/first.jpg' }
  it('keeps the deck image once chosen', () => {
    expect(stickyPlaymatArt('deck https://x/bigger.jpg', 'me', first)).toBe(first)
  })
  it('lets a commander replace it', () => {
    expect(stickyPlaymatArt('commander https://x/c.jpg', 'me', first).art).toBe('commander https://x/c.jpg')
  })
  it('lets a deck image replace a colour wash', () => {
    expect(stickyPlaymatArt('deck https://x/a.jpg', 'me', { ownerId: 'me', art: 'colors RED' }).art).toBe('deck https://x/a.jpg')
  })
  it('starts over for a different owner', () => {
    expect(stickyPlaymatArt('deck https://x/a.jpg', 'them', first)).toEqual({ ownerId: 'them', art: 'deck https://x/a.jpg' })
  })
})
