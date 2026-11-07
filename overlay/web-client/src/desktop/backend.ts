/**
 * Remote-backend support for the desktop (Tauri) build.
 *
 * The web build talks to whatever host served it (same-origin `/game` and `/api`). A desktop build
 * is served from `tauri://localhost`, so it has to be told where the backend lives. Set
 * `VITE_BACKEND_URL` (e.g. `https://magic.wingedsheep.com`) at build time; leave it unset and
 * everything stays same-origin, exactly like upstream.
 */

const raw = (import.meta.env as Record<string, string | undefined>).VITE_BACKEND_URL?.trim()

/** The backend origin with no trailing slash, or `null` when the build is same-origin. */
export const BACKEND_URL: string | null = raw ? raw.replace(/\/+$/, '') : null

/** `ws(s)://host/game` for the configured backend. */
export function backendWebSocketUrl(): string | null {
  if (!BACKEND_URL) return null
  return `${BACKEND_URL.replace(/^http/, 'ws')}/game`
}

/**
 * The origin to put in links players share (lobby invites, shared decks, cubes, tournaments).
 * In a desktop build `window.location.origin` is `http://tauri.localhost`, which nobody else can
 * open — share the public site instead.
 */
export function publicOrigin(): string {
  return BACKEND_URL ?? window.location.origin
}
