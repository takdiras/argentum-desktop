/**
 * The stack panel's yield control under the arena layout: three dots in the panel's top-right
 * corner instead of upstream's "» Yield…" pill under the card name, which cost a row of height on
 * a column that is already tall. Opens the same yield menu; tinted while a yield is active.
 */
import type { MouseEvent } from 'react'

export function YieldDots({ active, onClick }: { active: boolean; onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'Yield options (a yield is active)' : 'Yield options'}
      aria-haspopup="menu"
      title={
        active
          ? 'Yielding — click to change or revoke'
          : 'Yield options — stop being asked about this ability, or always answer its “you may”'
      }
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 20,
        width: 28,
        height: 28,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        cursor: 'pointer',
        color: active ? '#e8f0ff' : '#cbd6ea',
        background: active ? 'rgba(70, 110, 210, 0.5)' : 'rgba(255, 255, 255, 0.07)',
        border: `1px solid ${active ? 'rgba(130, 165, 240, 0.85)' : 'rgba(255, 255, 255, 0.14)'}`,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
        <circle cx="3" cy="8" r="1.7" />
        <circle cx="8" cy="8" r="1.7" />
        <circle cx="13" cy="8" r="1.7" />
      </svg>
    </button>
  )
}
