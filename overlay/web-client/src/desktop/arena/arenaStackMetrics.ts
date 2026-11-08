/**
 * Sizes and colours for the stack panel under the arena layout. The stack is where the game tells
 * you what is about to happen, so it gets the room and the contrast upstream's small, purple-on-
 * purple version doesn't: a card about 1.5x larger, and effect text that reads at a glance.
 *
 * Plain data in, plain data out; `StackZone` falls back to its own numbers when the layout is
 * classic, so nothing here applies there.
 */
import type { ResponsiveSizes } from '@/hooks/useResponsive'

export interface ArenaStackMetrics {
  /** Card art on the stack. */
  imageWidth: number
  imageHeight: number
  /** Visible sliver of each card beneath the top of a fanned stack. */
  cardOffset: number

  headerFont: number
  headerColor: string
  nameFont: number
  nameColor: string
  nameMaxWidth: number

  /** The box under the panel that spells out the top item's effect. */
  textBoxMaxWidth: number
  textFont: number
  /** Mana-symbol size inside the effect text (it takes its own size). */
  textSymbolSize: number
  textColor: string
  textLineHeight: number
  textBackground: string
  textBorder: string
  targetFont: number
  targetColor: string
  bulletColor: string

  panelBackground: string
  panelBorder: string
  panelPadding: string

  promptFont: number
  promptColor: string
  promptMaxWidth: number

  /** Small labels drawn over the card art (caster, yield tag). */
  overlayFont: number
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

export function arenaStackMetrics(r: ResponsiveSizes): ArenaStackMetrics {
  const mobile = r.isMobile
  // Scales with window height: the stack is a tall column, so height is the limit.
  const imageWidth = mobile ? 84 : clamp(Math.round(r.viewportHeight * 0.23), 170, 240)
  const textFont = mobile ? 13 : 15
  const textBoxMaxWidth = mobile ? 200 : clamp(imageWidth + 70, 270, 340)

  return {
    imageWidth,
    imageHeight: Math.round(imageWidth * 1.4),
    cardOffset: mobile ? 25 : 32,

    headerFont: mobile ? 12 : 14,
    headerColor: '#d3e2ff',
    nameFont: mobile ? 13 : 16,
    nameColor: '#ffffff',
    nameMaxWidth: textBoxMaxWidth,

    textBoxMaxWidth,
    textFont,
    textSymbolSize: textFont + 1,
    textColor: '#f7faff',
    textLineHeight: 1.45,
    textBackground: 'rgba(5, 9, 18, 0.97)',
    textBorder: '1px solid rgba(110, 145, 210, 0.5)',
    targetFont: mobile ? 12 : 14,
    targetColor: '#ffd98a',
    bulletColor: '#b7cbef',

    panelBackground: 'rgba(7, 11, 22, 0.96)',
    panelBorder: '1px solid rgba(100, 135, 200, 0.45)',
    panelPadding: mobile ? '8px 10px' : '12px 16px',

    promptFont: mobile ? 12 : 14,
    promptColor: '#eef4ff',
    promptMaxWidth: textBoxMaxWidth - 20,

    overlayFont: mobile ? 10 : 12,
  }
}
