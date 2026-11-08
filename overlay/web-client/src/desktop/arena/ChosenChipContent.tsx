/**
 * The inside of the "chosen …" chip on an arena tile. A chosen colour is drawn as its mana symbol (the
 * same SVGs the cost and ability text use) instead of the word "White"; a chosen creature type, mode,
 * card name or number stays as text, after the symbol if there is one.
 */
import { ManaSymbol } from '@/components/ui/ManaSymbols'
import { chosenColorSymbol } from './chosenColor'

export function ChosenChipContent({
  color,
  rest,
  iconSize,
}: {
  /** `card.chosenColor`. */
  color: string | null | undefined
  /** Everything else the card chose, already joined with spaces. */
  rest: string
  iconSize: number
}) {
  const symbol = chosenColorSymbol(color)
  if (!symbol) {
    // Not a colour we have a symbol for: keep upstream's plain text.
    return <>{[color, rest].filter(Boolean).join(' ')}</>
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <ManaSymbol symbol={symbol} size={iconSize} />
      {rest && <span>{rest}</span>}
    </span>
  )
}
