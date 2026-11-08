import { railInitials } from './arenaRail'

/**
 * A rail chip's seat name, both ways at once: the full name and its initials. `RAIL_ROW_CSS` shows only
 * the name in an ordinary chip, and in a condensed row (`data-rail-condensed`) shows the initials and
 * opens to the full name while the chip is hovered. Rendered inside the chip's `data-rail-name` span.
 */
export function RailName({ name }: { name: string }) {
  return (
    <>
      <span data-rail-initials aria-hidden>
        {railInitials(name)}
      </span>
      <span data-rail-full>{name}</span>
    </>
  )
}
