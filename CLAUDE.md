# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Tauri v2 desktop shell around the **upstream** [Argentum Engine](https://github.com/wingedsheep/argentum-engine) React web client. The UI source is **not stored here**. Only three things are tracked: `patches/` (edits to upstream files), `overlay/` (new files copied into upstream), and `src-tauri/` (the shell). There is no backend; the app talks to `https://magic.wingedsheep.com`. See `README.md` for user-facing behaviour of each feature (arena layout, Space hotkey, midnight theme, connection status, magic-link sign-in).

## Commands

Requires Bun, stable Rust, and Tauri's platform prerequisites.

```bash
bun install
bun run dev            # tauri dev (hot reload) against the production server
bun run build          # installer/bundle in src-tauri/target/release/bundle/
bun run prepare:web    # force re-fetch + re-patch of vendor/ (after editing UPSTREAM_COMMIT or a patch)
BACKEND_URL=https://other.example bun run dev   # different backend (also update CSP + capability, see README)
DESKTOP_THEME=original bun run dev              # skip the midnight-theme Vite plugin
```

`dev`/`build` run `scripts/ensure-vendor.sh` first, which only re-runs `prepare.sh` when `vendor/` is missing or its HEAD differs from `UPSTREAM_COMMIT`. The dev server is pinned to `127.0.0.1:1420` with `--strictPort`; the port is duplicated in `package.json` (`dev:web`) and `src-tauri/tauri.conf.json` (`devUrl`).

There is no root-level test or lint script. Tests are vitest files in `overlay/` that run **inside the vendored client**:

```bash
cd vendor/argentum-engine/web-client
bunx --bun vitest run src/desktop                       # all overlay tests
bunx --bun vitest run src/desktop/arena/arenaHand.test.ts   # one file
bunx --bun vitest run -t "name substring"                   # one test by name
bun run typecheck                                       # tsc --noEmit (upstream's script)
```

## CI and releases

`.github/workflows/release.yml` runs overlay tests + typecheck, then builds macOS (arm64 and x64), Linux and Windows with `tauri-action`. PRs and manual runs only build. Pushing a tag `vX.Y.Z` also creates a **draft** GitHub release with the installers, and fails the `check` job unless the tag equals `version` in `src-tauri/tauri.conf.json` (keep that, `Cargo.toml` and `package.json` in step when bumping). The workflow sets `BACKEND_URL` itself; without it the bundle would be a same-origin build that can't reach the server. Builds are unsigned.

## Architecture: patch + overlay workflow

`scripts/prepare.sh` wipes and rebuilds `vendor/argentum-engine` (git-ignored, sparse checkout of upstream's `web-client/` at the SHA in `UPSTREAM_COMMIT`): applies `patches/*.patch` in filename order with `git apply`, then `cp -R overlay/web-client/. vendor/.../web-client/`, then `bun install`.

Consequences to keep in mind:

- **New behaviour goes in `overlay/web-client/src/desktop/…`** (imported upstream as `@/desktop/...`). Patches should be only the few lines that hook overlay code into upstream files. Prefer a new overlay file over growing a patch.
- **Editing `overlay/` does not affect a running `vendor/`.** Overlay files are *copied*, so after changing one, either re-run `bun run prepare:web` or copy the file into `vendor/argentum-engine/web-client/` too. Always make the change in `overlay/` (the tracked source); a vendor-only edit is lost on the next prepare.
- **Patches are cumulative and order matters.** Several touch the same upstream file (`GameBoard.tsx` is in 0003, 0006, 0008; `Battlefield.tsx` in 0003, 0009), and each is applied on top of the previous ones. Paths inside patches are `a/web-client/...`, relative to `vendor/argentum-engine`. To change a patch, edit the files in `vendor/`, then regenerate that patch's hunks (`git -C vendor/argentum-engine diff -- <files>`) taking care to exclude hunks owned by other patches, and confirm with `bun run prepare:web` that everything still applies from scratch. A new upstream hook gets a new numbered patch (`00NN-short-name.patch`) rather than being folded into an unrelated one.
- Bumping `UPSTREAM_COMMIT` can break patches; `prepare:web` fails loudly when one no longer applies.
- Commit style in history: Conventional Commits (`feat(arena): …`, `fix(desktop): …`), usually updating the matching `README.md` section in the same commit as the code and patch.

## Architecture: runtime

- **`src-tauri/`** is deliberately thin: `lib.rs` registers `tauri-plugin-http` and one command, `net_log`, which the web client calls to mirror its connection log to the terminal as `[net]` lines. `tauri.conf.json` has `withGlobalTauri: true`, a strict CSP, and a capability (`capabilities/default.json`) allowing HTTP to `magic.wingedsheep.com` only. Changing backend host means updating the capability allow list **and** the CSP `connect-src`/`img-src`. `Cargo.toml` enables the plugin's `gzip`/`brotli`/`deflate` features; without them the ~29 MB `/api/cards` catalog loads many times slower.
- **Self-update:** `config.rs` loads `config.json` from the app config dir (created with defaults on first run; `autoUpdate` defaults to `true`; an invalid file is ignored, never overwritten). `updater.rs` runs from `setup` in `lib.rs`: it checks `releases/latest/download/latest.json`, installs in the background, and asks before restarting. It is skipped under `debug_assertions` (`tauri dev`). It is pure Rust, so the capability file needs no updater/dialog permissions; don't add them. The base `tauri.conf.json` has the updater `pubkey` but **not** `createUpdaterArtifacts`, so local builds don't need the signing key; `tauri.updater.conf.json` turns it on and CI passes it only for `v*` tags, with the `TAURI_SIGNING_PRIVATE_KEY` secret. Release signing rules live in the README ("Updates").
- **Why Rust-side HTTP:** the production server sends no CORS headers, so a `tauri://localhost` webview can't `fetch` it. `overlay/.../installDesktopFetch.ts` (a side-effect module, imported via the `main.tsx` hunk in patch 0001) replaces `window.fetch`: backend requests go through `window.__TAURI__.http.fetch` (Rust, no CORS), relative `/api/...` paths are resolved against `VITE_BACKEND_URL`, and other hosts (Scryfall) use the browser's fetch. WebSockets go direct (`backendWebSocketUrl()` used by the patched `network/websocket.ts`). Everything is a no-op when `VITE_BACKEND_URL` is unset, i.e. it behaves like upstream's same-origin build. `BACKEND_URL` is injected as `VITE_BACKEND_URL` by the `dev:web`/`build:web` scripts, which go through `scripts/desktop.mjs`. Keep env handling there and out of `package.json`: `VAR=value cmd` is POSIX-only and breaks on Windows, where `npm run` (and tauri's `beforeBuildCommand`) uses cmd.exe.
- **Connection log** (`connectionLog.ts`, `ConnectionStatus.tsx`, `installWebSocketLogging.ts`, `requestKinds.ts`): every request/WebSocket is recorded; aborted requests and `/api/dev/*` calls (answered locally with a 404 when the backend is remote) are classified as "cancelled", not failures. Tauri's own IPC fetches (`ipc://`, `*.ipc.localhost`) must stay excluded from logging or the `net_log` mirror would log itself forever.
- **Arena layout** (`overlay/.../desktop/arena/`): pure, unit-tested metric functions (`arenaMetrics.ts`, `arenaStackMetrics.ts`, `arenaHand.ts`, `arenaRail.ts`, `arenaBadgeStyle.ts`) feed `useArenaSlotLayout.ts` and the `ArenaZones.tsx`/`ArenaCardFace.tsx` components. `arenaLayoutStore.ts` holds the Arena/Classic setting in `localStorage` (never sent to the server); patched upstream code branches on `useArenaLayout()` so Classic renders exactly as upstream. Keep layout math in the pure modules with tests rather than in components.
- **Midnight theme** (`desktop-midnight-theme.mjs`): a Vite plugin registered by patch 0005 that retints purple colours by hue/saturation at build time, instead of patching ~45 components. It has a `.d.mts` for the `vite.config.ts` import.
- **Primary-action hotkey** (`hotkeys/primaryActionHotkey.ts`): finds the bottom-right button via markers (`data-learn="pass"` upstream, `data-primary-action` added by patch 0006), never by label text; it must stay inert while typing, with dialogs/menus open, or on a disabled button.
- **Sign-in:** magic-link emails point at the public site, so the desktop flow is paste-the-link (`PasteSignInLink.tsx` + `signInLink.ts`, hooked in by patch 0002).

The vendored client has its own `CLAUDE.md`/`AGENTS.md` (upstream's conventions) under `vendor/argentum-engine/web-client/`; read them when changing upstream-facing code, but treat `vendor/` as generated.
