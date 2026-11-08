/**
 * The compact battlefield card: a name bar over the card's art, nothing else. Everything that makes
 * a permanent interactive — its outline, tapped rotation, P/T badge (bottom-right), counters,
 * keyword icons, targeting highlights, hover preview — still comes from `GameCard`, which draws
 * this in place of the full card image when the arena layout is on.
 *
 * Fills its parent (`GameCard`'s card box, which clips to its rounded corners).
 */
import { useState, type CSSProperties } from 'react'
import type { ClientCard } from '@/types'
import { getCdnArtCropUrl, getScryfallArtCropUrl } from '@/utils/cardImages'
import { getTokenFrameGradient, getTokenFrameTextColor, useResponsiveContext } from '@/components/game/board/shared'

/** Fraction of the tile the name bar takes. */
const NAME_BAR_SHARE = 0.24

/** Art sources to try in order: Scryfall's CDN crop, then the by-name API, then no image. */
function artSources(card: ClientCard): string[] {
  const sources: string[] = []
  // Some tokens already carry an art-only image.
  if (card.imageUri?.includes('/art_crop/')) sources.push(card.imageUri)
  const cdn = getCdnArtCropUrl(card.imageUri)
  if (cdn) sources.push(cdn)
  sources.push(getScryfallArtCropUrl(card.name))
  return sources
}

export function ArenaCardFace({
  card,
  faceDown,
  faceDownSrc,
  imageStyle,
  tapped = false,
}: {
  card: ClientCard
  faceDown: boolean
  /** Tapped permanents are washed grey and carry a tap icon, since they only tilt slightly. */
  tapped?: boolean
  /** The card-back image, used instead of art when the permanent is face down. */
  faceDownSrc: string
  /** Flip-token rotation, if the card has one. */
  imageStyle?: CSSProperties | undefined
}) {
  const responsive = useResponsiveContext()
  const width = responsive.battlefieldCardWidth
  const [failed, setFailed] = useState(0)
  const sources = artSources(card)
  const src = sources[failed]

  const fontSize = Math.max(9, Math.min(13, Math.round(width * 0.11)))

  const fill: CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit' }

  // Applied to the face only, never the badges GameCard draws on top (P/T, counters, keywords).
  const tappedWash: CSSProperties = tapped ? { filter: 'grayscale(0.9) brightness(0.72)' } : {}
  const tapIcon = tapped ? <TapMark width={width} /> : null

  if (faceDown) {
    return (
      <div style={{ ...fill, background: '#10131c' }}>
        <img
          src={faceDownSrc}
          alt="Card back"
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...tappedWash }}
        />
        {tapIcon}
      </div>
    )
  }

  return (
    <div style={{ ...fill, background: '#10131c' }}>
    <div style={{ ...fill, display: 'flex', flexDirection: 'column', ...tappedWash }}>
      <div
        style={{
          flex: `0 0 ${NAME_BAR_SHARE * 100}%`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          background: getTokenFrameGradient(card.colors),
          color: getTokenFrameTextColor(card.colors),
          fontSize,
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          boxShadow: '0 1px 0 rgba(0, 0, 0, 0.45)',
          zIndex: 1,
        }}
        title={card.name}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</span>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {src && (
          <img
            src={src}
            alt={card.name}
            draggable={false}
            onError={() => setFailed((n) => n + 1)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...imageStyle }}
          />
        )}
        {/* A soft shade along the bottom so the P/T badge reads over any art. */}
        <div
          aria-hidden
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, transparent 55%, rgba(0, 0, 0, 0.5))' }}
        />
      </div>
    </div>
    {tapIcon}
    </div>
  )
}

/** A dimming scrim with the tap symbol in a disc, centred over the art. */
function TapMark({ width }: { width: number }) {
  const disc = Math.max(22, Math.round(width * 0.38))
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        background: 'rgba(8, 10, 18, 0.28)',
      }}
    >
      <span
        title="Tapped"
        style={{
          width: disc,
          height: disc,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(12, 14, 24, 0.78)',
          border: '1.5px solid rgba(226, 232, 240, 0.65)',
          color: '#e2e8f0',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.6)',
          marginTop: Math.round(width * 0.06),
        }}
      >
        <i className="ms ms-tap" style={{ fontSize: Math.round(disc * 0.62), lineHeight: 1 }} />
      </span>
    </div>
  )
}
