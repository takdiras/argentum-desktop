/**
 * Side-effect module: in a desktop build, route every request aimed at the backend through
 * Tauri's HTTP plugin, resolve relative `/api/...` paths against `VITE_BACKEND_URL`, and record
 * every request (and WebSocket) in the connection log.
 *
 * Why the plugin: the production server sends no CORS headers, so a webview served from
 * `tauri://localhost` can't `fetch` it directly. The plugin's `fetch` runs in Rust, where CORS
 * doesn't apply. It's reached through `window.__TAURI__.http` (enabled by `withGlobalTauri`), so
 * the web client needs no extra npm dependency.
 *
 * Anything that isn't a backend request (Scryfall, etc.) keeps using the browser's own `fetch`,
 * but is logged too. With `VITE_BACKEND_URL` unset this module does nothing.
 */
import { BACKEND_URL } from './backend'
import { describeError, logFinish, logStart } from './connectionLog'
import { installWebSocketLogging } from './installWebSocketLogging'
import { mountConnectionStatus } from './mountConnectionStatus'

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

  const urlOf = (input: RequestInfo | URL): string =>
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

  // Tauri's own `invoke` is a `fetch` to `ipc://localhost/<cmd>` (`http://ipc.localhost/…` on some
  // platforms). Logging those would log our own log mirroring (`net_log`) forever, and they aren't
  // network traffic anyway.
  const isInternal = (url: string): boolean =>
    /^(ipc|asset|tauri):/i.test(url) || /^https?:\/\/(ipc|asset)\.localhost\b/i.test(url)

  window.fetch = async (input, init) => {
    const target = resolve(input)
    const url = urlOf(target)
    if (isInternal(url)) return nativeFetch(target, init)
    const method = (init?.method ?? (typeof target === 'object' && 'method' in target ? target.method : 'GET')).toUpperCase()
    const viaTauri = tauriFetch()
    const useTauri = !!viaTauri && url.startsWith(BACKEND_URL!)

    // A backend request that has to fall back to the webview will almost certainly die on CORS.
    // Say so in the log, because the browser's own message ("Load failed") is useless.
    const missingPlugin = !viaTauri && url.startsWith(BACKEND_URL!)
    const id = logStart({
      kind: 'http',
      method,
      url,
      transport: useTauri ? 'tauri' : 'browser',
      detail: missingPlugin ? 'Tauri HTTP plugin not available — falling back to browser fetch' : '',
    })

    try {
      const res = await (useTauri ? viaTauri!(target, init) : nativeFetch(target, init))
      logFinish(id, res.ok ? 'ok' : 'error', `${res.status} ${res.statusText}`.trim())
      return res
    } catch (e) {
      logFinish(id, 'error', describeError(e))
      throw e
    }
  }

  installWebSocketLogging()
  mountConnectionStatus()
}

install()
