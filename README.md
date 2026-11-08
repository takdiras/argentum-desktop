# Argentum Desktop

A [Tauri](https://tauri.app) desktop client for [Argentum Engine](https://github.com/wingedsheep/argentum-engine),
the Magic: The Gathering rules engine and online play platform by
[wingedsheep](https://github.com/wingedsheep). It wraps the upstream React web client and plays against
the public server at <https://magic.wingedsheep.com>. No backend is bundled or run locally.

> Unofficial, community-made. Not affiliated with or endorsed by the Argentum Engine maintainers.
> Argentum Engine is MIT licensed; this project follows suit.

## How it works

The UI is **not copied** into this repo. `scripts/prepare.sh` fetches the upstream `web-client` at the
commit pinned in [`UPSTREAM_COMMIT`](UPSTREAM_COMMIT), applies the patches in `patches/`, copies in the new
files from `overlay/`, and the Tauri shell bundles the result.

New behaviour lives in new files wherever possible, and each patch is only the few lines that hook those
files into upstream. That keeps upstream's code recognisable and the patches easy to rebase.

| Piece | What it does |
|-------|--------------|
| `patches/0001-remote-backend.patch` | Edits to existing upstream files: a WebSocket URL from the configured backend, and share links that use the public site instead of `tauri.localhost`. |
| `patches/0002-desktop-sign-in.patch` | One line in the sign-in modal that shows the paste-the-link step (desktop build only). |
| `patches/0003-arena-layout.patch` | Switches the battlefield, the card face and the board's height split to the arena layout, and adds its setting to Preferences. |
| `patches/0004-arena-stack.patch` | Larger stack card, bigger and higher-contrast effect text, and the three-dot yield button. |
| `patches/0005-midnight-theme.patch` | Registers the build-time theme plugin in `vite.config.ts`. |
| `patches/0006-primary-action-hotkey.patch` | Marks the combat and distribute confirm buttons, and the card action menu, for the Space hotkey. |
| `patches/0007-opponent-waiting-indicator.patch` | Mounts the waiting spinner beside the opponent's name in the life display. |
| `patches/0008-arena-opponent-hand-and-top-rail.patch` | Floats the opponent's hand, runs the multiplayer seat rail along the top, and keeps pod cells equal. |
| `overlay/web-client/src/desktop/` | New files: `backend.ts`, `installDesktopFetch.ts` and the connection status (above), and `PasteSignInLink.tsx` + `signInLink.ts` (sign-in, below). |
| `overlay/web-client/src/desktop/arena/` | The arena layout: zones, compact card face, sizing solver, stack metrics, settings control. |
| `overlay/web-client/desktop-midnight-theme.mjs` | The Vite plugin that retints upstream's purples to near-black navy. |
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

## Arena board layout

A compact battlefield, in the spirit of MTG Arena but not a copy of it. Switch it in **Preferences → Board
layout** (the gear in the game, or `/preferences`): *Arena* (default) or *Classic* (upstream's layout). The
choice is stored in `localStorage` only; it is never sent to the server.

- **Compact cards.** A permanent is a name bar over its art, about a third less area than a full card. Power
  and toughness sit at the bottom-right. Counters, keywords, targeting highlights and the hover preview
  (which still shows the whole card) are unchanged, because the compact face is drawn by upstream's own
  `GameCard`. Corners keep a real card's proportion (3 mm on 63 mm, about 4.8% of the width), so they match
  an actual card at any size instead of upstream's fixed 8 px. Keyword, token and stack-count icons start
  below the name bar, so they never hide the name. The P/T badge is centred on the bottom edge (it hangs
  half off the tile) with even padding, and it turns with the card when tapped. Tiles grow with the window
  (up to about 168 px wide) and shrink to fit; the layout reserves room for the badge's overhang.
- **Zones.** Creatures and planeswalkers in the middle; **lands bottom-left**; **enchantments, artifacts and
  everything else bottom-right**. The opponent's board is the mirror image, packed into the upper part.
- **Your board gets the room.** In a two-player game your battlefield gets about 62 % of the height and the
  opponent's about 38 %, instead of the two being sized to match. In a multiplayer pod every cell gets an
  equal share: no seat is favoured.
- **The opponent's hand floats.** It is face down and never clicked, so it no longer has a row of its own.
  In a two-player game it floats at the top of the window *behind* the opponent's tiles, and the row above
  their board shrinks to a strip that clears the corner buttons. In a pod each seat's fan is tucked partly
  behind its name plate (the lower half of the cards still shows, so you can count them), and the board
  starts higher. Top and bottom rows use the same fan, and your own cell reserves the same trimmed band so
  the bottom boards line up. **Your own hand is unchanged**: it is read and clicked, so nothing covers it.
- **The seat rail is a row.** In a pod the list of seats (life, hand count, the Overview and Follow
  toggles) runs along the top of the window instead of down the left edge, which gives the board that column
  back. Team games keep their grouped column, and phones keep the compact one.
- **Waiting on the opponent.** While the game is waiting on a player (they hold priority and you have nothing
  to answer, or the server reports them deciding), a small spinner appears beside their name after a short
  delay, so an instant pass doesn't flash it. It never shows for you, once the game is over, or when
  spectating.
- **Tapped permanents** tilt about 15° (`ARENA_TAP_TILT_DEG`), turn grey, and carry a tap icon. They only tilt
  slightly, so the grey wash and icon are what mark them. The layout reserves the tilted footprint, so
  tapping never overlaps a neighbour.
- **The stack** is larger: the card is about 1.5× wider, the effect text is 15 px in near-white on near-black
  (it was 9 px in pale purple), and the yield control is a small `⋯` in the panel's top-right corner instead
  of a pill under the card name.

Arena applies to the two-player board and to multiplayer seats; the stack changes apply whenever Arena is on.
Classic leaves every one of them as upstream draws it.

## Keyboard

**Space** presses the primary button at the bottom-right, whatever it says at that moment: Pass, End Turn,
Resolve, To Attackers, Skip Attacking, Attack with N, No Blocks, Confirm Blocks, or the confirm button of a
damage/counter distribution prompt. A small space-bar keycap on the button shows it's the one Space will press.

It is deliberately cautious:

- It does nothing when the button is disabled, so it can never act when upstream says you can't.
- It does nothing while you're typing (chat, deck name, any text field), or while a dialog, menu or the card
  action menu ("Cast X", "Play Swamp") is open, so it can't pass priority behind something you're still reading.
- Holding Space doesn't repeat; each press is one click.
- In declare-attackers it picks "Skip Attacking" until you've selected an attacker, then "Attack with N". It
  never picks "Attack All" for you.

The code is `overlay/web-client/src/desktop/hotkeys/primaryActionHotkey.ts`; the buttons are found by markers
(`data-learn="pass"` upstream, `data-primary-action` added by `patches/0006`), never by their changing labels.

## Midnight theme

Upstream's near-black surfaces are fine, but about 190 purple `rgba()` and hex colours are hard-coded across
roughly 45 components (the stack panel, yield menus, decision dialogs, and more). Rather than patch each, a
small Vite plugin (`overlay/web-client/desktop-midnight-theme.mjs`) retints clearly purple colours (hue
245–320° and visibly saturated) to deep navy as each file is built: backgrounds get darker, borders stay
visible, pale lavender text turns cool white. Greys, mana colours and card art are not touched.

Colours that deliberately mean "purple" (the control-hijack highlight, "special" badges) become blue too.
Build without it by setting `DESKTOP_THEME=original`:

```bash
DESKTOP_THEME=original bun run dev
```

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

Two kinds of event are shown as grey **cancelled**, not as failures, so the failure count means connection
problems:

- requests the page aborted itself (a poll superseded, a component unmounting);
- `/api/dev/*` calls. Those endpoints exist only on development servers; the web client's dev-only panels
  (AI insight and the like) poll them whenever the app runs as a dev build, and a production server answers
  every poll with a 404. Against a remote backend the app answers that 404 locally instead of sending the
  requests. A backend on `localhost` still receives them.

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
