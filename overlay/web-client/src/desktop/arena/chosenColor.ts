/**
 * Turning the colour a permanent has "chosen" (Thriving lands, Riptide Replicator and the like) into the
 * mana symbol that stands for it, so the tile can show the symbol instead of spelling the word out.
 *
 * Pure, so it is unit-testable. The server sends a colour name; tolerate case and the one-letter form
 * in case another source sends it that way.
 */
export type ManaSymbolKey = 'W' | 'U' | 'B' | 'R' | 'G' | 'C'

const BY_NAME: Record<string, ManaSymbolKey> = {
  white: 'W',
  blue: 'U',
  black: 'B',
  red: 'R',
  green: 'G',
  colorless: 'C',
}

/** The mana symbol for a chosen colour, or null when the value isn't a colour (a creature type, a mode…). */
export function chosenColorSymbol(color: string | null | undefined): ManaSymbolKey | null {
  if (!color) return null
  const key = color.trim().toLowerCase()
  const named = BY_NAME[key]
  if (named) return named
  return key.length === 1 && 'wubrgc'.includes(key) ? (key.toUpperCase() as ManaSymbolKey) : null
}
