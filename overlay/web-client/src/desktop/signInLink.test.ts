import { describe, expect, it } from 'vitest'
import { extractLoginToken } from './signInLink'

const TOKEN = 'abcDEF123_-abcDEF123_-abcDEF123_-abcDEF1234'

describe('extractLoginToken', () => {
  it('reads the token from a full magic link', () => {
    expect(extractLoginToken(`https://magic.wingedsheep.com/login/verify?token=${TOKEN}`)).toBe(TOKEN)
  })

  it('tolerates surrounding whitespace and a trailing fragment', () => {
    expect(extractLoginToken(`  https://x.test/login/verify?token=${TOKEN}#top \n`)).toBe(TOKEN)
  })

  it('reads a bare query string', () => {
    expect(extractLoginToken(`/login/verify?token=${TOKEN}`)).toBe(TOKEN)
    expect(extractLoginToken(`token=${TOKEN}`)).toBe(TOKEN)
  })

  it('accepts the bare token', () => {
    expect(extractLoginToken(TOKEN)).toBe(TOKEN)
  })

  it('rejects empty input and ordinary text', () => {
    expect(extractLoginToken('')).toBeNull()
    expect(extractLoginToken('   ')).toBeNull()
    expect(extractLoginToken('hello there')).toBeNull()
    expect(extractLoginToken('short')).toBeNull()
  })
})
