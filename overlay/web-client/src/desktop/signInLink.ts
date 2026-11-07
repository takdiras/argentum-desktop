/**
 * Pull the one-time token out of whatever the user pasted from a magic-link email: the full link
 * (`https://…/login/verify?token=…`), just its query string, or the bare token.
 *
 * Returns `null` when nothing in the text looks like a token.
 */
export function extractLoginToken(pasted: string): string | null {
  const text = pasted.trim()
  if (!text) return null

  // A full link, or a "?token=…" / "token=…" fragment.
  try {
    const url = new URL(text)
    const fromUrl = url.searchParams.get('token')
    if (fromUrl) return fromUrl
  } catch {
    // not a URL — fall through
  }
  const fromQuery = /(?:^|[?&])token=([^&\s#]+)/.exec(text)
  if (fromQuery?.[1]) {
    try {
      return decodeURIComponent(fromQuery[1])
    } catch {
      return fromQuery[1]
    }
  }

  // A bare token: a single run of base64 characters, long enough that it isn't just a word.
  return /^[A-Za-z0-9_\-+/=]{20,}$/.test(text) ? text : null
}
