import { describe, expect, it } from 'vitest'
import { BLOCKING_SELECTOR, PRIMARY_ACTION_SELECTORS, isPlainSpace, isTypingContext } from './primaryActionHotkey'

const key = (over: Partial<Parameters<typeof isPlainSpace>[0]> = {}) => ({
  code: 'Space',
  key: ' ',
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...over,
})

describe('isPlainSpace', () => {
  it('accepts a plain first press of Space', () => {
    expect(isPlainSpace(key())).toBe(true)
  })

  it('ignores auto-repeat, so holding Space cannot pass priority over and over', () => {
    expect(isPlainSpace(key({ repeat: true }))).toBe(false)
  })

  it('ignores Space combined with a modifier, and every other key', () => {
    for (const m of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'] as const) expect(isPlainSpace(key({ [m]: true }))).toBe(false)
    expect(isPlainSpace(key({ code: 'Enter', key: 'Enter' }))).toBe(false)
    expect(isPlainSpace(key({ code: 'KeyA', key: 'a' }))).toBe(false)
  })
})

describe('isTypingContext', () => {
  it('leaves Space alone in text fields, selects and editable regions', () => {
    expect(isTypingContext('INPUT', false, null)).toBe(true)
    expect(isTypingContext('textarea', false, null)).toBe(true)
    expect(isTypingContext('SELECT', false, null)).toBe(true)
    expect(isTypingContext('DIV', true, null)).toBe(true)
    expect(isTypingContext('DIV', false, 'textbox')).toBe(true)
  })

  it('does not treat ordinary elements or buttons as typing', () => {
    expect(isTypingContext('BODY', false, null)).toBe(false)
    expect(isTypingContext('DIV', false, null)).toBe(false)
    expect(isTypingContext('BUTTON', false, null)).toBe(false)
  })
})

describe('selectors', () => {
  it('looks for combat and distribute buttons before the priority button', () => {
    expect(PRIMARY_ACTION_SELECTORS[0]).toBe('[data-primary-action]')
    expect(PRIMARY_ACTION_SELECTORS).toContain('[data-learn="pass"]')
  })

  it('treats dialogs, menus and the card action menu as owning the keyboard', () => {
    for (const s of ['data-blocks-hotkeys', 'role="dialog"', 'aria-modal="true"', 'role="menu"']) expect(BLOCKING_SELECTOR).toContain(s)
  })
})
