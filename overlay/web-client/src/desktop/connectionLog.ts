/**
 * A small in-memory log of every network operation the desktop client performs, the data behind
 * the bottom-left connection indicator. Newest entries are kept; old ones fall off the end.
 *
 * Entries are also mirrored to the Rust side (`net_log` command), which prints them to stderr.
 * That makes failures visible in the `bun run dev` terminal even when nobody is looking at the
 * window, and it is how the silent `.catch(() => {})` calls in the web client become debuggable.
 */

export type NetKind = 'http' | 'ws'
/** `cancelled`: the page gave up on it (or it was skipped) — not a connection failure. */
export type NetStatus = 'pending' | 'ok' | 'error' | 'cancelled'

export interface NetEntry {
  id: number
  kind: NetKind
  /** `GET`, `POST`… for HTTP; `WS` for sockets. */
  method: string
  url: string
  /** Host + path (no query), for compact display. */
  label: string
  /** Which stack carried the request: Tauri's Rust HTTP client or the webview itself. */
  transport: 'tauri' | 'browser'
  status: NetStatus
  /** `200 OK`, `closed (1006)`, an error message… */
  detail: string
  startedAt: number
  durationMs: number | null
}

const MAX_ENTRIES = 300

let entries: NetEntry[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit(): void {
  // New array identity on every change so `useSyncExternalStore` sees a fresh snapshot.
  entries = entries.slice()
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getEntries(): readonly NetEntry[] {
  return entries
}

export function clearEntries(): void {
  entries = []
  listeners.forEach((l) => l())
}

function labelFor(url: string): string {
  try {
    const u = new URL(url, window.location.href)
    return `${u.host}${u.pathname}`
  } catch {
    return url
  }
}

function mirrorToRust(entry: NetEntry): void {
  const invoke = (window as unknown as {
    __TAURI__?: { core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } }
  }).__TAURI__?.core?.invoke
  if (!invoke) return
  const ms = entry.durationMs === null ? '' : ` ${entry.durationMs}ms`
  const line = `${entry.status.toUpperCase()} ${entry.kind} ${entry.method} ${entry.url} [${entry.transport}] ${entry.detail}${ms}`
  invoke('net_log', { line }).catch(() => {})
}

export function logStart(init: {
  kind: NetKind
  method: string
  url: string
  transport: 'tauri' | 'browser'
  detail?: string
}): number {
  const entry: NetEntry = {
    id: nextId++,
    kind: init.kind,
    method: init.method,
    url: init.url,
    label: labelFor(init.url),
    transport: init.transport,
    status: 'pending',
    detail: init.detail ?? '',
    startedAt: Date.now(),
    durationMs: null,
  }
  entries = [entry, ...entries].slice(0, MAX_ENTRIES)
  emit()
  return entry.id
}

export function logFinish(id: number, status: Exclude<NetStatus, 'pending'>, detail: string): void {
  const entry = entries.find((e) => e.id === id)
  if (!entry) return
  entry.status = status
  entry.detail = detail
  entry.durationMs = Date.now() - entry.startedAt
  mirrorToRust(entry)
  emit()
}

/** Update an in-flight entry without finishing it (a socket going from connecting to open). */
export function logUpdate(id: number, status: NetStatus, detail: string): void {
  const entry = entries.find((e) => e.id === id)
  if (!entry) return
  entry.status = status
  entry.detail = detail
  if (status !== 'pending' && entry.durationMs === null) entry.durationMs = Date.now() - entry.startedAt
  mirrorToRust(entry)
  emit()
}

export function describeError(e: unknown): string {
  if (e instanceof Error) return e.message || e.name
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}
