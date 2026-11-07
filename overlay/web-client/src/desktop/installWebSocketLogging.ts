/**
 * Replace `window.WebSocket` with a thin subclass that records each socket's lifecycle in the
 * connection log (connecting → open → closed / error). Behaviour is otherwise untouched, so the
 * web client's own reconnect logic keeps working exactly as before.
 */
import { logUpdate, logStart } from './connectionLog'

export function installWebSocketLogging(): void {
  const Native = window.WebSocket

  class LoggedWebSocket extends Native {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols)
      const href = typeof url === 'string' ? url : url.href
      // The dev server's own hot-reload socket is same-origin; it isn't a game connection.
      try {
        if (new URL(href, window.location.href).host === window.location.host) return
      } catch {
        // unparsable URL: log it like any other
      }
      const id = logStart({ kind: 'ws', method: 'WS', url: href, transport: 'browser', detail: 'connecting…' })

      this.addEventListener('open', () => logUpdate(id, 'ok', 'open'))
      this.addEventListener('error', () => logUpdate(id, 'error', 'connection error'))
      this.addEventListener('close', (ev: CloseEvent) => {
        // 1000/1001 are ordinary shutdowns, not failures.
        const normal = ev.code === 1000 || ev.code === 1001
        const reason = ev.reason ? ` — ${ev.reason}` : ''
        logUpdate(id, normal ? 'ok' : 'error', `closed (${ev.code})${reason}`)
      })
    }
  }

  window.WebSocket = LoggedWebSocket as unknown as typeof WebSocket
}
