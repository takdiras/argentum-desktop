/**
 * The draw animation, in place of upstream's `DrawAnimations`.
 *
 * Upstream flew the card to the middle of the hand while the real card was already sitting in it, then
 * faded it out. Here a drawn card makes one continuous trip:
 *
 *   library → its own slot in the hand (back showing, turning to sit at that slot's angle) → turns over
 *
 * and your hand holds that slot empty until the card has landed (`usePendingDrawIds`). An opponent's card
 * flies to their hand back showing and stays that way.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameStore, type DrawAnimation } from '@/store/gameStore.ts'
import { useResponsive } from '@/hooks/useResponsive.ts'
import { CARD_BACK_IMAGE_URL, getScryfallFallbackUrl } from '@/utils/cardImages.ts'
import { drawDuration, drawProgress, flipAngle, lerp } from './drawFlight'

/** The element, unless it is laid out entirely outside the viewport (a shared-strip table keeps off-screen boards mounted). */
function visibleOrNull(el: Element | null): Element | null {
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  const offScreen = rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight
  return offScreen ? null : el
}

interface Flight {
  startX: number
  startY: number
  startScale: number
  endX: number
  endY: number
  endScale: number
  endRotation: number
}

function findFlight(animation: DrawAnimation, cardWidth: number, cardHeight: number): Flight {
  const isOpponent = animation.isOpponent
  // Zones are matched on their owner: a multiplayer table renders one opponent library and hand per
  // opponent. An opponent whose board is off-screen has no zones, so the card flies to their player anchor.
  const owner = `[data-zone-owner="${animation.playerId}"]`
  const librarySelector = isOpponent ? `[data-zone="opponent-library"]${owner}` : '[data-zone="player-library"]'
  const handSelector = isOpponent ? `[data-zone="opponent-hand"]${owner}` : '[data-zone="hand"]'
  const playerAnchor = isOpponent ? document.querySelector(`[data-player-id="${animation.playerId}"]`) : null

  const libraryEl = visibleOrNull(document.querySelector(librarySelector)) ?? playerAnchor
  const handEl = visibleOrNull(document.querySelector(handSelector)) ?? playerAnchor
  // The card's own slot in your hand, when it is there to fly to.
  const slotEl =
    !isOpponent && animation.cardId
      ? visibleOrNull(document.querySelector(`[data-hand-card-id="${CSS.escape(animation.cardId)}"]`))
      : null

  const flight: Flight = {
    startX: window.innerWidth - 80,
    startY: isOpponent ? 100 : window.innerHeight - 100,
    startScale: 0.3,
    endX: window.innerWidth / 2,
    endY: isOpponent ? 60 : window.innerHeight - cardHeight / 2 - 20,
    endScale: 1,
    endRotation: 0,
  }

  if (libraryEl) {
    const rect = libraryEl.getBoundingClientRect()
    flight.startX = rect.left + rect.width / 2
    flight.startY = rect.top + rect.height / 2
    // Leave at the size of the pile's top card.
    if (rect.width > 0 && cardWidth > 0) flight.startScale = Math.max(0.15, Math.min(1.2, rect.width / cardWidth))
  }

  if (slotEl) {
    const rect = slotEl.getBoundingClientRect()
    flight.endX = rect.left + rect.width / 2
    flight.endY = rect.top + rect.height / 2
    const slotWidth = Number((slotEl as HTMLElement).dataset.handWidth)
    if (slotWidth > 0 && cardWidth > 0) flight.endScale = slotWidth / cardWidth
    flight.endRotation = Number((slotEl as HTMLElement).dataset.handRotation) || 0
  } else if (handEl) {
    const rect = handEl.getBoundingClientRect()
    flight.endX = rect.left + rect.width / 2
    flight.endY = rect.top + rect.height / 2
  }
  return flight
}

const faceStyle = (width: number, height: number, radius: number) =>
  ({
    position: 'absolute',
    inset: 0,
    width,
    height,
    borderRadius: radius,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  }) as const

function DrawAnimationCard({
  animation,
  onComplete,
  cardWidth,
  cardHeight,
}: {
  animation: DrawAnimation
  onComplete: () => void
  cardWidth: number
  cardHeight: number
}) {
  const flips = !animation.isOpponent
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [imageError, setImageError] = useState(false)
  // Held in a ref: the parent hands every card a new callback each render, and a re-run of the effect
  // below would restart the flight whenever another card is drawn mid-flight.
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    let raf = 0
    let finish = 0
    const run = () => {
      const t0 = performance.now()
      setStarted(true)
      const tick = () => {
        const dt = performance.now() - t0
        setElapsed(dt)
        if (dt < drawDuration(flips)) raf = requestAnimationFrame(tick)
        else finish = window.setTimeout(() => onCompleteRef.current(), 50)
      }
      raf = requestAnimationFrame(tick)
    }
    const delay = window.setTimeout(run, Math.max(0, animation.startTime - Date.now()))
    return () => {
      window.clearTimeout(delay)
      window.clearTimeout(finish)
      cancelAnimationFrame(raf)
    }
  }, [animation.startTime, flips])

  // Before its turn the card waits unseen at the library.
  if (!started) return null

  const { fly, flip } = drawProgress(elapsed, flips)
  const f = findFlight(animation, cardWidth, cardHeight)
  const x = lerp(f.startX, f.endX, fly)
  const y = lerp(f.startY, f.endY, fly)
  const scale = lerp(f.startScale, f.endScale, fly)
  const rotation = lerp(0, f.endRotation, fly)
  // An opponent's card has nowhere to land that you can see: it fades in and out of view.
  const opacity = flips ? 1 : fly < 0.05 ? fly * 20 : fly > 0.85 ? (1 - fly) * 6.67 : 1

  const radius = Math.round(cardWidth * 0.05)
  // (Upstream passed `getCardImageUrl` its arguments in the wrong order here, so the face never loaded.)
  const imageUrl = animation.imageUri ?? (animation.cardName ? getScryfallFallbackUrl(animation.cardName, 'normal') : null)
  const showFront = flips && (imageUrl !== null || animation.cardName !== null)

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
        opacity,
        zIndex: 'var(--z-animation)' as unknown as number,
        pointerEvents: 'none',
        perspective: 900,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: cardWidth,
          height: cardHeight,
          transformStyle: 'preserve-3d',
          transform: `rotateY(${flipAngle(flip)}deg)`,
        }}
      >
        {/* Back: what leaves the library, and all an opponent's card ever shows. */}
        <div style={{ ...faceStyle(cardWidth, cardHeight, radius), border: '2px solid #333', boxSizing: 'border-box' }}>
          <img src={CARD_BACK_IMAGE_URL} alt="Card back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {/* Face: seen once the card has turned over at its slot. */}
        {showFront && (
          <div style={{ ...faceStyle(cardWidth, cardHeight, radius), transform: 'rotateY(180deg)' }}>
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={animation.cardName || 'Card'}
                onError={() => setImageError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#2a2a3e',
                  border: '2px solid #666',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                }}
              >
                <span style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{animation.cardName}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Container for all active draw animations. */
export function DrawAnimations() {
  const drawAnimations = useGameStore((state) => state.drawAnimations)
  const removeDrawAnimation = useGameStore((state) => state.removeDrawAnimation)
  const responsive = useResponsive()

  const handleComplete = useCallback((id: string) => removeDrawAnimation(id), [removeDrawAnimation])

  if (drawAnimations.length === 0) return null

  return (
    <>
      {drawAnimations.map((animation) => (
        <DrawAnimationCard
          key={animation.id}
          animation={animation}
          onComplete={() => handleComplete(animation.id)}
          cardWidth={responsive.cardWidth}
          cardHeight={responsive.cardHeight}
        />
      ))}
    </>
  )
}
