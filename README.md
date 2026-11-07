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
| `overlay/web-client/src/desktop/` | New files: `backend.ts` (the `VITE_BACKEND_URL` helper) and `installDesktopFetch.ts` (routes `/api/*` calls through Tauri's HTTP plugin). |
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
bun run prepare:web   # fetch + patch + install the upstream web-client (re-run after changing UPSTREAM_COMMIT or the patch)
bun run dev           # desktop window with hot reload, talking to the production server
```

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

## Known limitations

- **Magic-link sign-in.** The emailed link opens the website, not the app, so it signs you in there. Playing
  as a guest works fine. A deep link (`tauri-plugin-deep-link`) would fix this.
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
