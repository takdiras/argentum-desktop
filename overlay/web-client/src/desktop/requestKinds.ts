/**
 * Pure helpers that decide how the desktop client treats a request, kept out of the fetch wrapper so
 * they can be tested without a DOM.
 */

/** A backend on this machine: it may well expose the dev endpoints the production server doesn't. */
export function isLocalBackend(backendUrl: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(backendUrl)
}

/**
 * `/api/dev/*` exists only on development servers. The web client's dev-only panels (AI insight and
 * the like) poll it whenever the app runs as a dev build, and a remote production server answers every
 * poll with a 404 — dozens of useless requests, and failures in the log that aren't failures.
 */
export function isDevOnlyEndpoint(url: string, backendUrl: string): boolean {
  if (isLocalBackend(backendUrl)) return false
  if (!url.startsWith(backendUrl)) return false
  const path = url.slice(backendUrl.length)
  return path === '/api/dev' || path.startsWith('/api/dev/') || path.startsWith('/api/dev?')
}

/**
 * A request the page itself gave up on (an AbortController fired as a component unmounted or a poll was
 * superseded) isn't a connection failure and shouldn't count as one. Tauri's HTTP plugin reports that
 * in more than one way: a "canceled" message, an AbortError, or "The resource id N is invalid" when the
 * response body is read after the request was cancelled.
 */
export function isCancellation(error: unknown, signalAborted: boolean): boolean {
  if (signalAborted) return true
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /abort|cancel|resource id \S+ is invalid/i.test(message)
}
