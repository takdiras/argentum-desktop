/**
 * Bottom-left connection indicator, in the spirit of a browser's loading status bar.
 *
 * The pill shows the latest network event (loading / done / failed). Hovering it opens a panel
 * listing every request and WebSocket the app has made, failures highlighted, for debugging.
 * Self-contained on purpose (inline styles, no upstream CSS modules) so it survives upstream
 * restyling.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { clearEntries, getEntries, subscribe, type NetEntry } from './connectionLog'

const COLORS = {
  ok: '#4ade80',
  error: '#f87171',
  pending: '#fbbf24',
  idle: '#94a3b8',
  cancelled: '#64748b',
}

function useEntries(): readonly NetEntry[] {
  return useSyncExternalStore(subscribe, getEntries, getEntries)
}

function time(ms: number): string {
  const d = new Date(ms)
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

function describe(e: NetEntry): string {
  const what = e.kind === 'ws' ? `WS ${e.label}` : `${e.method} ${e.label}`
  if (e.status === 'pending') {
    const secs = Math.floor((Date.now() - e.startedAt) / 1000)
    return `${e.kind === 'ws' ? 'Connecting' : 'Loading'} ${e.label}…${secs >= 2 ? ` ${secs}s` : ''}`
  }
  if (e.status === 'error') return `Failed: ${what} — ${e.detail || 'unknown error'}`
  if (e.status === 'cancelled') return `Cancelled: ${what} — ${e.detail || 'cancelled'}`
  return `${what} — ${e.detail}${e.durationMs !== null && e.kind === 'http' ? ` (${e.durationMs} ms)` : ''}`
}

function plainText(entries: readonly NetEntry[]): string {
  return [...entries]
    .reverse()
    .map((e) => `${time(e.startedAt)} ${e.status.toUpperCase()} ${e.method} ${e.url} [${e.transport}] ${e.detail}${e.durationMs !== null ? ` ${e.durationMs}ms` : ''}`)
    .join('\n')
}

export function ConnectionStatus() {
  const entries = useEntries()
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [failedOnly, setFailedOnly] = useState(false)
  const [copied, setCopied] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const open = hover || pinned
  const [, setTick] = useState(0)

  // Closing is delayed so a pointer crossing from the pill into the panel (or briefly drifting
  // off it) doesn't dismiss the list before it can be reached.
  const enter = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    setHover(true)
  }, [])
  const leave = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setHover(false), 350)
  }, [])
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // Escape closes a pinned panel.
  useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

  const pending = entries.filter((e) => e.status === 'pending' && e.kind === 'http')
  const hasPending = pending.length > 0

  // Re-render once a second while a request is in flight, so its elapsed time keeps counting.
  useEffect(() => {
    if (!hasPending) return
    const t = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [hasPending])
  const failed = entries.filter((e) => e.status === 'error')
  const latest = entries[0]
  const socketOpen = entries.some((e) => e.kind === 'ws' && e.status === 'ok' && e.detail === 'open')
  const socketTried = entries.some((e) => e.kind === 'ws')

  // Dot colour: something loading → amber; the latest event failed → red; otherwise green/grey.
  const dot =
    pending.length > 0 ? COLORS.pending
    : latest?.status === 'error' ? COLORS.error
    : latest?.status === 'cancelled' ? COLORS.idle
    : latest ? COLORS.ok
    : COLORS.idle

  const line = pending.length > 0
    ? describe(pending[0]!) + (pending.length > 1 ? ` (+${pending.length - 1})` : '')
    : latest ? describe(latest) : 'Waiting for network activity'

  const shown = failedOnly ? entries.filter((e) => e.status === 'error') : entries

  return (
    <div
      onMouseEnter={enter}
      onMouseLeave={leave}
      style={{ position: 'fixed', left: 10, bottom: 10, zIndex: 2147483000, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 }}
    >
      {open && (
        // The outer box sits flush against the pill and carries the visual gap as padding, so the
        // pointer is always over the pill, this bridge, or the panel — never over dead space.
        <div style={{ position: 'absolute', left: 0, bottom: '100%', width: 'min(640px, 92vw)', paddingBottom: 8 }}>
        <div
          role="log"
          aria-label="Network activity"
          style={{
            maxHeight: '55vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'rgba(15,18,28,0.97)', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 8,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 12 }}>Network</strong>
            <span style={{ color: '#94a3b8' }}>
              {entries.length} events · <span style={{ color: failed.length ? COLORS.error : '#94a3b8' }}>{failed.length} failed</span>
              {' · '}socket {socketOpen ? <span style={{ color: COLORS.ok }}>open</span> : socketTried ? <span style={{ color: COLORS.error }}>not open</span> : 'not started'}
            </span>
            <span style={{ flex: 1 }} />
            <button type="button" style={btn(failedOnly)} onClick={() => setFailedOnly((v) => !v)}>Failed only</button>
            <button type="button" style={btn(pinned)} onClick={() => setPinned((v) => !v)} title="Keep the list open (Esc closes)">
              {pinned ? 'Pinned' : 'Pin'}
            </button>
            <button
              type="button"
              style={btn(false)}
              onClick={() => {
                navigator.clipboard?.writeText(plainText(entries)).then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1500)
                }).catch(() => {})
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" style={btn(false)} onClick={clearEntries}>Clear</button>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {shown.length === 0 && <div style={{ padding: 12, color: '#94a3b8' }}>{failedOnly ? 'No failures.' : 'Nothing yet.'}</div>}
            {shown.map((e) => (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '8px 86px 1fr', gap: 8, padding: '5px 10px', borderBottom: '1px solid #1e293b', background: e.status === 'error' ? 'rgba(248,113,113,0.08)' : 'transparent' }}>
                <span style={{ width: 8, height: 8, marginTop: 3, borderRadius: 4, background: COLORS[e.status] }} />
                <span style={{ color: '#64748b' }}>{time(e.startedAt)}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ color: '#cbd5e1' }}>{e.kind === 'ws' ? 'WS' : e.method}</span>{' '}
                  <span style={{ wordBreak: 'break-all' }} title={e.url}>{e.label}</span>
                  <span style={{ color: e.status === 'error' ? COLORS.error : '#94a3b8' }}>
                    {' — '}{e.status === 'pending' ? `pending… ${Math.floor((Date.now() - e.startedAt) / 1000)}s` : e.detail}
                    {e.durationMs !== null && e.kind === 'http' ? ` · ${e.durationMs} ms` : ''}
                  </span>
                  <span style={{ color: '#475569' }}> · {e.transport}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      <div
        tabIndex={0}
        role="button"
        aria-expanded={open}
        title="Hover to see all network activity · click to pin"
        onClick={() => setPinned((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setPinned((v) => !v)
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, maxWidth: 'min(460px, 80vw)', padding: '4px 10px',
          background: 'rgba(15,18,28,0.82)', color: failed.length && latest?.status === 'error' ? '#fecaca' : '#cbd5e1',
          border: '1px solid #334155', borderRadius: 999, cursor: 'pointer', backdropFilter: 'blur(4px)',
        }}
      >
        <span style={{ flex: 'none', width: 8, height: 8, borderRadius: 4, background: dot, animation: pending.length ? 'argentum-net-pulse 1s ease-in-out infinite' : undefined }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line}</span>
        {failed.length > 0 && (
          <span style={{ flex: 'none', padding: '0 6px', borderRadius: 999, background: 'rgba(248,113,113,0.2)', color: COLORS.error }}>{failed.length} failed</span>
        )}
      </div>
    </div>
  )
}

function btn(active: boolean): CSSProperties {
  return {
    font: 'inherit', cursor: 'pointer', padding: '2px 8px', borderRadius: 6,
    border: `1px solid ${active ? '#f87171' : '#475569'}`, background: active ? 'rgba(248,113,113,0.15)' : 'transparent', color: '#e2e8f0',
  }
}
