import { describe, expect, it } from 'vitest'
import { isCancellation, isDevOnlyEndpoint, isLocalBackend } from './requestKinds'

const PROD = 'https://magic.wingedsheep.com'

describe('isLocalBackend', () => {
  it('recognises this machine, with or without a port', () => {
    expect(isLocalBackend('http://localhost:8080')).toBe(true)
    expect(isLocalBackend('http://127.0.0.1:8080')).toBe(true)
    expect(isLocalBackend('http://[::1]:8080')).toBe(true)
    expect(isLocalBackend('http://localhost')).toBe(true)
  })

  it('does not treat a remote host, or one that merely starts like localhost, as local', () => {
    expect(isLocalBackend(PROD)).toBe(false)
    expect(isLocalBackend('https://localhost.example.com')).toBe(false)
  })
})

describe('isDevOnlyEndpoint', () => {
  it('flags /api/dev on a remote backend', () => {
    expect(isDevOnlyEndpoint(`${PROD}/api/dev/ai-insight/abc?limit=5`, PROD)).toBe(true)
    expect(isDevOnlyEndpoint(`${PROD}/api/dev`, PROD)).toBe(true)
  })

  it('never flags a local backend, which does serve them', () => {
    expect(isDevOnlyEndpoint('http://localhost:8080/api/dev/ai-insight/abc', 'http://localhost:8080')).toBe(false)
  })

  it('leaves real endpoints and look-alikes alone', () => {
    expect(isDevOnlyEndpoint(`${PROD}/api/cards`, PROD)).toBe(false)
    expect(isDevOnlyEndpoint(`${PROD}/api/devices`, PROD)).toBe(false)
    expect(isDevOnlyEndpoint(`${PROD}/api/auth/me`, PROD)).toBe(false)
  })

  it('ignores requests to other hosts', () => {
    expect(isDevOnlyEndpoint('https://api.scryfall.com/api/dev/x', PROD)).toBe(false)
  })
})

describe('isCancellation', () => {
  it('is true whenever the page aborted the request', () => {
    expect(isCancellation(new Error('anything'), true)).toBe(true)
  })

  it('recognises the plugin and the browser ways of saying cancelled', () => {
    expect(isCancellation(new Error('Request canceled'), false)).toBe(true)
    expect(isCancellation(new DOMException('The operation was aborted', 'AbortError'), false)).toBe(true)
    expect(isCancellation('The resource id 933404336 is invalid.', false)).toBe(true)
  })

  it('does not hide real failures', () => {
    expect(isCancellation(new Error('error sending request for url'), false)).toBe(false)
    expect(isCancellation(new TypeError('Load failed'), false)).toBe(false)
    expect(isCancellation('connection refused', false)).toBe(false)
  })
})
