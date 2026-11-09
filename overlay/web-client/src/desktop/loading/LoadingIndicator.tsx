/**
 * A spinner with a label, shown while a deck list (or the card catalog behind its tiles) is still
 * loading, so an empty or half-filled screen can be told apart from "finished, nothing to show".
 *
 * `block` fills the space a list would occupy; `inline` is a slim row to sit above or beside a list
 * that already has something in it (e.g. browser decks shown while the account's decks still load).
 * It appears after a short delay so a near-instant load doesn't flash a spinner.
 */
import { useEffect, useState, type CSSProperties } from 'react'

const KEYFRAMES = `
@keyframes argentum-loading-spin { to { transform: rotate(360deg) } }
@media (prefers-reduced-motion: reduce) { .argentum-loading-spinner { animation-duration: 2.4s !important } }
`

export const LOADING_SHOW_DELAY_MS = 120

export function LoadingIndicator({
  label = 'Loading…',
  variant = 'block',
  delayMs = LOADING_SHOW_DELAY_MS,
  style,
}: {
  label?: string
  variant?: 'block' | 'inline'
  delayMs?: number
  style?: CSSProperties
}) {
  const [shown, setShown] = useState(delayMs <= 0)
  useEffect(() => {
    if (delayMs <= 0) return
    const timer = window.setTimeout(() => setShown(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  const block = variant === 'block'
  const size = block ? 22 : 13
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-desktop-loading
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: block ? 'center' : 'flex-start',
        gap: block ? 12 : 8,
        padding: block ? '40px 16px' : '4px 2px',
        color: 'rgba(255, 255, 255, 0.72)',
        fontSize: block ? 15 : 12,
        // Reserve the row while the delay runs so the list doesn't jump when the spinner appears.
        visibility: shown ? 'visible' : 'hidden',
        ...style,
      }}
    >
      <style>{KEYFRAMES}</style>
      <span
        aria-hidden
        className="argentum-loading-spinner"
        style={{
          flex: 'none',
          width: size,
          height: size,
          boxSizing: 'border-box',
          borderRadius: '50%',
          border: `${block ? 3 : 2}px solid rgba(255, 255, 255, 0.16)`,
          borderTopColor: 'rgba(255, 255, 255, 0.85)',
          animation: 'argentum-loading-spin 0.9s linear infinite',
        }}
      />
      <span>{label}</span>
    </div>
  )
}
