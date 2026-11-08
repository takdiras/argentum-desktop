/**
 * A card image that shows a shimmering placeholder (with the card's name, if given) until the picture has
 * loaded, then fades it in.
 * Card art comes from Scryfall and takes a moment to arrive; without this a card is an empty box (or its
 * alt text) first and then pops in.
 *
 * Renders a fragment — the placeholder, then the `<img>` — so it drops in where a bare `<img>` was: the
 * placeholder fills the nearest positioned ancestor (the card's own box, which already clips to its
 * rounded corners), and the `<img>` stays the sibling its callers expect (`GameCard` reaches for the
 * element after it when an image fails for good).
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactEventHandler } from 'react'

const KEYFRAMES = '@keyframes argentum-skeleton { from { background-position: 200% 0 } to { background-position: -200% 0 } }'

let injected = false
function ensureKeyframes(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.textContent = KEYFRAMES
  document.head.appendChild(style)
}

/** The shimmer: a pale band sweeping across a dark base that matches the midnight theme. */
export const SKELETON_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  pointerEvents: 'none',
  backgroundColor: '#141927',
  backgroundImage: 'linear-gradient(100deg, transparent 30%, rgba(148, 163, 205, 0.16) 50%, transparent 70%)',
  backgroundSize: '200% 100%',
  animation: 'argentum-skeleton 1.4s linear infinite',
}

/** The card's name, shown on the placeholder so a card can be read before its picture has arrived. */
const LABEL_STYLE: CSSProperties = {
  display: 'block',
  padding: '9% 8% 0',
  textAlign: 'center',
  color: '#cbd5e1',
  fontWeight: 700,
  lineHeight: 1.15,
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
}

export function SkeletonImage({
  src,
  alt,
  style,
  onError,
  draggable,
  label,
  labelFontSize = 11,
}: {
  src: string
  alt: string
  style?: CSSProperties | undefined
  onError?: ReactEventHandler<HTMLImageElement> | undefined
  draggable?: boolean | undefined
  /** Text to show on the placeholder until the picture loads (a card's name). */
  label?: string | undefined
  labelFontSize?: number | undefined
}) {
  ensureKeyframes()
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  // A new source starts over; an image already in the cache may have finished before we were listening.
  useEffect(() => {
    const img = ref.current
    setLoaded(img !== null && img.complete && img.naturalWidth > 0)
  }, [src])

  return (
    <>
      {!loaded && (
        <span aria-hidden style={SKELETON_STYLE}>
          {label && <span style={{ ...LABEL_STYLE, fontSize: labelFontSize }}>{label}</span>}
        </span>
      )}
      <img
        ref={ref}
        src={src}
        alt={alt}
        draggable={draggable}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          onError?.(e)
          // The caller gave up on the picture (hid it for a text fallback): nothing more is coming.
          if (e.currentTarget.style.display === 'none') setLoaded(true)
        }}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 0.2s ease-out' }}
      />
    </>
  )
}
