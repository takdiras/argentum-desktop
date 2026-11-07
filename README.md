# Argentum Desktop

A [Tauri](https://tauri.app) desktop client for [Argentum Engine](https://github.com/wingedsheep/argentum-engine),
the Magic: The Gathering rules engine and online play platform by
[wingedsheep](https://github.com/wingedsheep). It wraps the upstream React web client and plays against
the public server at <https://magic.wingedsheep.com>. No backend is bundled or run locally.

> Unofficial, community-made. Not affiliated with or endorsed by the Argentum Engine maintainers.
> Argentum Engine is MIT licensed; this project follows suit.

## How it works

The UI is **not copied** into this repo. `scripts/prepare.sh` fetches the upstream `web-client` at the
commit pinned in [`UPSTREAM_COMMIT`](UPSTREAM_COMMIT), applies a small patch, and the Tauri shell bundles the
result.

| Piece | What it does |
|-------|--------------|
| `patches/0001-remote-backend.patch` | Edits to existing upstream files: a WebSocket URL from the configured backend, and share links that use the public site instead of `tauri.localhost`. |
| `patches/0002-desktop-sign-in.patch` | One line in the sign-in modal that shows the paste-the-link step (desktop build only). |
| `overlay/web-client/src/desktop/` | New files: `backend.ts` (the `VITE_BACKEND_URL` helper), `installDesktopFetch.ts` (routes `/api/*` calls through Tauri's HTTP plugin), and `PasteSignInLink.tsx` + `signInLink.ts` (magic-link sign-in, below). |
| `src-tauri/` | The Tauri v2 shell: window config, CSP, and a capability that allows HTTP to `magic.wingedsheep.com` only. |

**Why the HTTP plugin?** The production server sends no CORS headers, so a webview served from
`tauri://localhost` can't `fetch` it. The plugin makes requests from Rust, where CORS doesn't apply.
WebSockets aren't subject to CORS and the server accepts any origin, so `/game` connects directly.
Nothing on the server needed to change.

## Requirements

- [Bun](https://bun.sh)
- [Rust](https://rustup.rs) (stable)
- Tauri's [platform prerequisites](https://tauri.app/start/prerequisites/) (Xcode CLT on macOS, WebView2 on Windows, WebKitGTK on Linux)

## Run

```bash
bun install
bun run dev           # desktop window with hot reload, talking to the production server
```

The first `dev` or `build` fetches and patches the upstream web-client by itself (a minute or two, needs
network access to GitHub). To redo that on demand, for example after changing `UPSTREAM_COMMIT` or a patch:

```bash
bun run prepare:web
```

The dev server listens on `127.0.0.1:1420` and fails immediately if that port is taken, instead of quietly
loading some other app. Free the port, or change it in both `package.json` (`dev:web`) and
`src-tauri/tauri.conf.json` (`devUrl`).

Build an installer or app bundle:

```bash
bun run build         # output in src-tauri/target/release/bundle/
```

### Using a different backend

```bash
BACKEND_URL=https://my-server.example bun run dev
```

Also change the URL in `src-tauri/capabilities/default.json` (`http:default` allow list) and in the CSP's
`connect-src` / `img-src` in `src-tauri/tauri.conf.json`. Both are locked to the production host by default.

## Connection status

A small pill in the bottom-left corner shows the latest network event, like a browser's status bar:
`Loading magic.wingedsheep.com/api/cards… 12s`, a finished request with its timing, or `Failed: …` in red
with a failure count.

- **Hover** the pill to open the full list of every request and WebSocket the app has made: time, method,
  path, status, duration, which stack carried it (`tauri` = the Rust HTTP client, `browser` = the webview),
  and the error for failures.
- **Click** the pill (or *Pin*) to keep the list open so you can scroll it; `Esc` closes it.
- *Failed only* filters to errors, *Copy* puts the whole log on the clipboard, *Clear* empties it.

The same events are printed to the terminal as `[net] …` lines under `bun run dev`.

Why it exists: the upstream client swallows several request errors (for example `fetch('/api/cards')
.catch(() => {})`), so a failed or slow load looks like missing data instead of an error. The deck view,
for one, labels every card "not implemented" until the card catalog has arrived.

**The card catalog is large.** `/api/cards` is about 29 MB of JSON uncompressed (about 3 MB gzipped, 21k cards).
Tauri's HTTP plugin doesn't request compression unless its `gzip` / `brotli` / `deflate` features are enabled,
so this project enables them in `src-tauri/Cargo.toml`. Without that, the catalog takes many times longer
and decks show "not implemented" for the whole wait.

## Signing in

Accounts use a passwordless magic link. The server builds that link from its own configured public URL, so
the email always points at the website (`https://magic.wingedsheep.com/login/verify?token=…`), never at this
app, and the token inside works exactly once. A one-click "open in the app" link would need the server's
domain to serve app-link files, which is a server-side change this project deliberately doesn't depend on.

So in the desktop app:

1. Enter your email in the sign-in dialog and request the link.
2. In the email, **don't click the button.** Right-click it and choose *Copy link address*. Opening it in a
   browser signs you in on the website and uses up the token.
3. Paste the link into the dialog's *Paste the sign-in link* field and press *Sign in with link*.

The pasted text can be the full link, just `?token=…`, or the bare token. If the link was already opened or
has expired, request a new one.

If the server maintainers ever add a redirect or app-link support, a `tauri-plugin-deep-link` handler could
replace the paste step; nothing here blocks that.

## Known limitations

- **Sign-in is copy-and-paste, not one click.** See [Signing in](#signing-in) below. Playing as a guest needs
  no account.
- **Server compatibility.** The app speaks whatever protocol the pinned client version speaks. If the server
  ships a breaking change, bump `UPSTREAM_COMMIT`, re-run `bun run prepare:web`, and rebuild.
- **Dev-only features** (Scenario Builder, `/api/dev/*`) only exist on development servers.

## Updating the upstream client

```bash
git ls-remote https://github.com/wingedsheep/argentum-engine.git main   # pick a commit
echo <sha> > UPSTREAM_COMMIT
bun run prepare:web   # fails loudly if the patch no longer applies
```

If the patch stops applying, fix the conflicts inside `vendor/argentum-engine`, then regenerate it with
`git -C vendor/argentum-engine diff > patches/0001-remote-backend.patch`.

## License

MIT, see [LICENSE](LICENSE). Upstream's license and copyright notice apply to the web client it fetches.
