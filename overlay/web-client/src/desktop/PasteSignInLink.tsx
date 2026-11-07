/**
 * Desktop-only step of the magic-link sign-in modal.
 *
 * The server emails a link to the public website and the token inside is single-use, so clicking
 * it signs you in in the browser, not here. Instead the user copies the link from the email
 * (without opening it) and pastes it here; we redeem the token ourselves.
 */
import { useState } from 'react'
import type React from 'react'
import a from '@/components/profile/account.module.css'
import p from '@/components/ui/PageShell.module.css'
import { extractLoginToken } from './signInLink'

export function PasteSignInLink() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const token = extractLoginToken(value)
    if (!token) {
      setError('That doesn’t look like a sign-in link. Copy the link from the email and paste it here.')
      return
    }
    // Same route the website uses; LoginVerifyPage redeems the token against the backend.
    window.location.assign(`/login/verify?token=${encodeURIComponent(token)}`)
  }

  return (
    <form onSubmit={submit} className={a.form}>
      <p className={a.muted}>
        In the desktop app, don’t open the link — it would sign you in on the website instead. Copy it (right-click the
        button in the email, then “Copy link address”), paste it below, and it works once.
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        placeholder="Paste the sign-in link"
        aria-label="Sign-in link from your email"
        autoComplete="off"
        spellCheck={false}
        className={p.input}
      />
      {error && <p className={a.error}>{error}</p>}
      <button type="submit" disabled={!value.trim()} className={p.buttonPrimary}>
        Sign in with link
      </button>
    </form>
  )
}
