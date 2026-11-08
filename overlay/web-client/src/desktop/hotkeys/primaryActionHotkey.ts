/**
 * Space presses the primary button at the bottom-right of the game: Pass, End Turn, Resolve,
 * To Attackers, Skip Attacking, No Blocks, Confirm Blocks, or a confirm in a distribution prompt —
 * whichever is enabled right now. Every one of those is a button upstream already renders; this
 * only finds the live one and clicks it.
 *
 * Buttons are found by markers, not by their label (which changes by phase):
 *   - `data-learn="pass"`        the priority button (Pass / Resolve / To Attackers / End Turn…),
 *                                already present upstream; disabled whenever passing isn't allowed
 *   - `data-primary-action`      the confirm/skip button of the combat and distribute prompts
 *                                (added by patches/0006)
 * A disabled button is never clicked, so Space does nothing when upstream says you can't act.
 */

/** Combat and distribution prompts first: while one is up, the priority button is disabled anyway. */
export const PRIMARY_ACTION_SELECTORS: readonly string[] = ['[data-primary-action]', '[data-learn="pass"]']

/**
 * Anything that owns the keyboard while open. Space must keep its normal meaning there, and above
 * all must not pass priority behind a dialog the player is still looking at.
 *  - `data-blocks-hotkeys`: the card action menu ("Cast X" / "Play Swamp"), added by patches/0006
 */
export const BLOCKING_SELECTOR = '[data-blocks-hotkeys], [role="dialog"], [aria-modal="true"], [role="menu"], [role="listbox"]'

/** Elements where a space is a typed character (or otherwise belongs to the control). */
export function isTypingContext(tagName: string, contentEditable: boolean, role: string | null): boolean {
  const tag = tagName.toUpperCase()
  if (contentEditable) return true
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return role === 'textbox' || role === 'combobox' || role === 'searchbox' || role === 'slider' || role === 'spinbutton'
}

/** True for a plain, first-press Space: no modifiers, not an auto-repeat. */
export function isPlainSpace(e: Pick<KeyboardEvent, 'code' | 'key' | 'repeat' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): boolean {
  return (e.code === 'Space' || e.key === ' ') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
}

/** The first enabled, visible primary button, or null. */
export function findPrimaryAction(root: ParentNode = document): HTMLButtonElement | null {
  for (const selector of PRIMARY_ACTION_SELECTORS) {
    for (const el of Array.from(root.querySelectorAll<HTMLButtonElement>(selector))) {
      if (!el.disabled && el.getClientRects().length > 0) return el
    }
  }
  return null
}

/**
 * The space-bar symbol (the open box, as on a keyboard legend) drawn as an SVG, so it doesn't depend
 * on any font having the glyph. White, because every button it sits on is dark or saturated.
 */
const SPACE_KEY_ICON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 6'%3E%3Cpath d='M1 1v4h10V1' fill='none' stroke='white' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"

const HINT_CSS = `
@media (hover: hover) {
  [data-primary-action]:not(:disabled)::after,
  [data-learn="pass"]:not(:disabled)::after {
    content: "";
    display: inline-block;
    width: 22px;
    height: 16px;
    margin-left: 10px;
    vertical-align: middle;
    border: 1px solid currentColor;
    border-radius: 4px;
    opacity: 0.6;
    background: ${SPACE_KEY_ICON} no-repeat center / 12px 6px;
  }
}`

export function installPrimaryActionHotkey(): void {
  // A small space-bar keycap on the button, so the shortcut can be found without reading a README.
  const style = document.createElement('style')
  style.textContent = HINT_CSS
  document.head.appendChild(style)

  // After we act on a keydown, the matching keyup must not also activate a focused button.
  let swallowKeyup = false

  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || !isPlainSpace(e)) return
    const target = e.target instanceof HTMLElement ? e.target : null
    if (target && isTypingContext(target.tagName, target.isContentEditable, target.getAttribute('role'))) return
    if (document.querySelector(BLOCKING_SELECTOR)) return

    const button = findPrimaryAction()
    if (!button) return

    e.preventDefault()
    // A button the player just clicked keeps focus, and the browser would press it again on keyup.
    if (target && target !== document.body && typeof target.blur === 'function') target.blur()
    swallowKeyup = true
    button.click()
  })

  window.addEventListener('keyup', (e) => {
    if (swallowKeyup && (e.code === 'Space' || e.key === ' ')) {
      swallowKeyup = false
      e.preventDefault()
    }
  })
}
