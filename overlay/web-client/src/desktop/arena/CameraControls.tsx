/**
 * Overview / Follow, the multiplayer camera settings, as a pair of small switches in the top-right
 * corner beside Concede. At a row-rail table they used to end the seat row; the seat row now goes
 * away when every board is on screen (see `railRowHidden`), and these two must stay reachable, so
 * they live with the other window controls.
 *
 * Renders nothing unless the table is a row-rail pod (the same test GameBoard uses), so mounting it
 * beside Concede in every game is harmless. Mounted by patch 0022.
 */
import type { CSSProperties } from 'react'
import { useGameStore } from '@/store/gameStore'
import { isFollowingAction } from '@/store/slices/ui/boardViewSlice'
import { useIsTeamGame, useOpponents } from '@/store/selectors'
import { useResponsiveContext } from '@/components/game/board/shared'
import { HelpTip } from '@/components/help/HelpTip'
import { useArenaLayout } from './arenaLayoutStore'
import { cameraControlsInCorner, railIsHorizontal, railViewportIsCompact } from './arenaRail'

export function CameraControls() {
  const responsive = useResponsiveContext()
  const arena = useArenaLayout()
  const isTeamGame = useIsTeamGame()
  const opponents = useOpponents()
  const overviewMode = useGameStore((s) => s.overviewMode)
  const toggleOverviewMode = useGameStore((s) => s.toggleOverviewMode)
  const followAction = useGameStore(isFollowingAction)
  const toggleFollowAction = useGameStore((s) => s.toggleFollowAction)

  const compact = railViewportIsCompact(responsive)
  const inCorner = cameraControlsInCorner({
    rowRail: railIsHorizontal(arena, isTeamGame, compact),
    multiplayer: opponents.length > 1,
    spectating: false,
  })
  if (!inCorner) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }} data-camera-controls>
      <CameraToggle
        label="Overview"
        on={overviewMode}
        accent="#b8a4ff"
        onClick={toggleOverviewMode}
        title={
          overviewMode
            ? 'Table overview: every opponent board is shown side-by-side. Click (or press 0) to focus one board.'
            : 'Focused camera: one opponent board at a time. Click (or press 0) to see the whole table at once.'
        }
      />
      <CameraToggle
        label="Follow"
        on={followAction}
        accent="#7cc8ff"
        onClick={toggleFollowAction}
        title={
          followAction
            ? 'Follow the action: the view slides to the active board automatically. Click for a manual camera.'
            : 'Manual camera: the view only moves when you switch boards. Click to follow the action.'
        }
      />
      <span style={{ display: 'inline-flex' }}>
        <HelpTip topicId="multiplayer-camera" label="How the multiplayer camera works" size="sm" />
      </span>
    </div>
  )
}

function CameraToggle({
  label,
  on,
  accent,
  title,
  onClick,
}: {
  label: string
  on: boolean
  accent: string
  title: string
  onClick: () => void
}) {
  const button: CSSProperties = {
    height: 26,
    padding: '0 8px 0 10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    borderRadius: 7,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(14, 16, 24, 0.72)',
    color: on ? '#e6e9f2' : '#8a8f9c',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'color 150ms',
  }
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} title={title} style={button}>
      {label}
      <span
        aria-hidden
        style={{
          position: 'relative',
          width: 18,
          height: 10,
          borderRadius: 999,
          background: on ? accent : 'rgba(255, 255, 255, 0.14)',
          transition: 'background 150ms',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 1.5,
            left: on ? 9.5 : 1.5,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: on ? '#0d1018' : '#9aa0ad',
            transition: 'left 150ms',
          }}
        />
      </span>
    </button>
  )
}
