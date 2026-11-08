import { describe, expect, it } from 'vitest'
import { chosenColorSymbol } from './chosenColor'

describe('chosenColorSymbol', () => {
  it('maps the five colour names to their mana symbols', () => {
    expect(chosenColorSymbol('White')).toBe('W')
    expect(chosenColorSymbol('Blue')).toBe('U')
    expect(chosenColorSymbol('Black')).toBe('B')
    expect(chosenColorSymbol('Red')).toBe('R')
    expect(chosenColorSymbol('Green')).toBe('G')
  })

  it('ignores case and surrounding space, and knows colorless', () => {
    expect(chosenColorSymbol('WHITE')).toBe('W')
    expect(chosenColorSymbol(' green ')).toBe('G')
    expect(chosenColorSymbol('Colorless')).toBe('C')
  })

  it('accepts the one-letter form', () => {
    expect(chosenColorSymbol('u')).toBe('U')
    expect(chosenColorSymbol('R')).toBe('R')
  })

  it('is null for anything that is not a colour', () => {
    expect(chosenColorSymbol(null)).toBeNull()
    expect(chosenColorSymbol(undefined)).toBeNull()
    expect(chosenColorSymbol('')).toBeNull()
    expect(chosenColorSymbol('Wizard')).toBeNull()
    expect(chosenColorSymbol('x')).toBeNull()
  })
})
