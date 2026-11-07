/**
 * Side-effect module: in a desktop build, route every request aimed at the backend through
 * Tauri's HTTP plugin and resolve relative `/api/...` paths against `VITE_BACKEND_URL`.
 *
 * Why: the production server sends no CORS headers, so a webview served from `tauri://localhost`
 * can't `fetch` it directly. The plugin's `fetch` runs in Rust, where CORS doesn't apply. It's
 * reached through `window.__TAURI__.http` (enabled by `withGlobalTauri`), so the web client needs
 * no extra npm dependency.
 *
 * Anything that isn't a backend request (Scryfall, etc.) keeps using the browser's own `fetch`.
 * With `VITE_BACKEND_URL` unset this module does nothing.
 */
import { BACKEND_URL } from './backend'

type FetchFn = typeof window.fetch

function install(): void {
  if (!BACKEND_URL) return

  const nativeFetch: FetchFn = window.fetch.bind(window)

  const tauriFetch = (): FetchFn | undefined =>
    (window as unknown as { __TAURI__?: { http?: { fetch?: FetchFn } } }).__TAURI__?.http?.fetch

  const resolve = (input: RequestInfo | URL): RequestInfo | URL => {
    if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) {
      return BACKEND_URL + input
    }
    return input
  }

  const isBackendRequest = (input: RequestInfo | URL): boolean => {
    const url =
      typeof input === 'string' ? input
      : input instanceof URL ? input.href
      : input.url
    return url.startsWith(BACKEND_URL!)
  }

  window.fetch = (input, init) => {
    const target = resolve(input)
    const viaTauri = tauriFetch()
    if (viaTauri && isBackendRequest(target)) return viaTauri(target, init)
    return nativeFetch(target, init)
  }
}

install()
