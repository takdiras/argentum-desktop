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
| `patches/0009-arena-tapped-footprint.patch` | Sizes tapped stacks of identical cards, and tapped creatures with attachments, from the tilted tile instead of a quarter-turned card. |
| `patches/0010-arena-stack-count.patch` | Arena stacks show their card count on the corner chip and hide the cards behind the first. |
| `patches/0011-hand-draw-and-reorder.patch` | Swaps in the desktop draw animation, hides a drawn card's slot until it lands, puts the rightmost hand card on top, and lets you drag your hand into a new order. |
| `patches/0012-play-animation.patch` | Mounts the animation that flies a played card to its place on the battlefield. |
| `patches/0013-card-image-skeleton.patch` | Draws a card's full image through `SkeletonImage`, so it shows a shimmer while loading. |
| `patches/0014-stack-above-combat-arrows.patch` | Masks the combat arrow layer (and the BLOCKED tag) where the stack panel is, so the stack stays on top of it. |
| `patches/0015-arena-overflow-visible.patch` | Arena only: stops the battlefield slot and the opponent's grid cell from clipping tilted tapped tiles and ungroup toggles at their edge. |
| `patches/0016-arena-stack-scroll.patch` | The stack panel stays scrolled to the top of the stack, and older cards pin to its top edge as thin strips. |
| `patches/0021-stack-side.patch` | Pins the stack panel to the left or right window edge (Preferences → Stack position) and opens its yield menu on the inward side. |
| `patches/0024-incoming-combat-damage.patch` | Mounts the incoming-damage badges next to the combat arrows. |
| `overlay/web-client/src/desktop/` | New files: `backend.ts`, `installDesktopFetch.ts` and the connection status (above), and `PasteSignInLink.tsx` + `signInLink.ts` (sign-in, below). |
| `overlay/web-client/src/desktop/arena/` | The arena layout: zones, compact card face, sizing solver, stack metrics, settings control. |
| `overlay/web-client/desktop-midnight-theme.mjs` | The Vite plugin that retints upstream's purples to near-black navy. |
| `src-tauri/` | The Tauri v2 shell: window config, CSP, a capability that allows HTTP to `magic.wingedsheep.com` only, the `config.json` loader and the self-updater (see [Updates](#updates)). |

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
  Creatures are sized first and keep their width (a lone creature is never shrunk by a crowded
  land row): lands and enchantments shrink to make room, down to 52 px, before creatures get smaller.
  A stack of identical cards hides all but a 6 px sliver of the ones behind the first, and its corner
  chip shows how many cards it holds (click it to ungroup; the ⤡ chip regroups) — patch 0010.
- **Draw animation and hand order.** A drawn card makes one trip: it leaves the library back showing, flies
  to its own slot in your hand (turning to that slot's angle), then flips face up there. Your hand holds the
  slot empty until it lands. An opponent's card flies to their hand and stays face down. In your fan the
  rightmost card is on top, and you can drag a card sideways to reorder your hand (a local preference, never
  sent to the server; a drag upward is still drag-to-cast, a click is still a click). Patch 0011; the logic is
  in `overlay/.../desktop/hand/` (`drawFlight.ts` timeline, `handOrder.ts` ordering, both unit-tested).
- **Cards fly wherever they go.** A card that changes zone flies there, whoever's it is: to its tile on a
  battlefield, to the stack, into a hand, or onto a graveyard, exile or library pile. It starts where the card
  was: under the cursor when you drag it out of your hand and let go (it stays put there until the table shows
  the play, up to 2 s, and lets go sooner if you are asked for a target or cost), else its hand slot, its tile,
  its stack item, or the pile it left. It lands on whatever size the board gave the tile, then the real card
  takes over. Moves are spotted by comparing where every card was before and after each state update
  (`PlayAnimations.tsx`, with `zoneFlights.ts` and `playFlight.ts` holding the tested logic; patch 0012 mounts
  it). Flights that start together are staggered, 70 ms apart (at most 0.7 s behind, at most 14 per update), so
  a board wipe ripples instead of leaving all at once. Stack flights are the quickest (0.24 s). An ability on
  the stack flies there as a copy from the permanent it came from (found by name and controller, preferring the
  one that just tapped; its source stays on the field). An opponent's card from their unseen hand or library
  starts from that pile when it shrank. Draws keep their own animation, and a token or a copy, which has
  nowhere to come from, just appears.
- **Image skeletons.** Card images come from Scryfall and take a moment, so a card shows a shimmering dark
  placeholder (carrying the card's name, on full card faces) until its picture has loaded, then fades the picture in (`desktop/cards/SkeletonImage.tsx`;
  the arena tile's art uses it directly, full card faces via patch 0013).
- **Chosen colour is a symbol.** A permanent that chose a colour as it entered (Thriving lands, Riptide
  Replicator…) shows that colour's mana symbol on its tile instead of the word "White". A chosen creature type,
  mode or number stays as text.
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
- **The seat rail is a row.** In a pod the list of seats (life, hand count) runs along the top of the window
  instead of down the left edge, which gives the board that column back. Team games keep their grouped column, and phones keep the compact one.
  When the row is too crowded to print names (six players on a laptop-sized window), each seat shows
  its initials, life and hand count, and **hovering a seat opens it to the full name** with a short slide.
  That keeps the row inside the space between the corner buttons, so it never runs under Concede.
- **Name plates carry the seat info; the row goes away.** On the all-boards table (Overview on, a bottom row
  of seats) every board already has a name plate, so the top row only repeated each name and life. The plate
  now also shows what the row did: whose turn it is (a ring and ▶), hand size (with a changed maximum such as
  `/∞`), speed, monarch / initiative / dungeon, player counters, commander damage, who is deciding, and the
  1-9 key that focuses the board, and the row is not drawn. It comes back whenever a board is *not* on screen
  (the focused camera, a collapsed cell, the combat defender split), since a chip is how you bring that
  board in. **Overview and Follow** now sit to the left of Concede (top right) instead of ending the row;
  spectators, who have no Concede, keep them in the rail. With the row gone the strip along the top rides up
  (10 px instead of 48), and a plate that would sit under Concede, the camera switches or the Fullscreen buttons
  steps down by just enough to clear them, so only those corner boards give a little of the gain back.
  Patches 0022 and 0023; `desktop/arena/SeatPlateExtras.tsx`, `CameraControls.tsx`, and the tested rules in
  `arenaRail.ts`.
- **You sit bottom centre at six players.** In a free-for-all with six (or seven) players the table shows
  three boards on the bottom row, and yours is the middle one: the next seat in turn order on your left,
  the previous seat on your right, the rest across the top. With fewer players (or eight) the bottom row has
  no centre, so you keep the bottom-right corner as upstream does.
- **Waiting on the opponent.** While the game is waiting on a player (they hold priority and you have nothing
  to answer, or the server reports them deciding), a small spinner appears beside their name after a short
  delay, so an instant pass doesn't flash it. It never shows for you, once the game is over, or when
  spectating.
- **Tapped permanents** tilt about 15° (`ARENA_TAP_TILT_DEG`), turn grey, and carry a tap icon. They only tilt
  slightly, so the grey wash and icon are what mark them. The layout reserves the tilted footprint, so
  tapping never overlaps a neighbour. That includes stacks of identical lands and creatures with attached
  cards: upstream sizes those as if a tapped card turned a full 90°, which left a 15° tile sticking out of
  its box (and clipped at the edge of a row), so they are sized from the tilted tile here.
- **Ungroup toggles aren't clipped.** The small arrows on a stack of identical cards hang just outside it, so
  the zones keep 8 px of headroom above and beside their tiles; a row at the edge of a board no longer cuts
  them off.
- **Tile size depends on the seat.** Each seat's tiles are the widest that fit that seat's own slot for what it
  has out, capped by the window height. A seat with few permanents therefore draws bigger tiles than a crowded
  one, and the sizes differ between seats in a pod.
- **The stack** is larger: the card is about 1.5× wider, the effect text is 15 px in near-white on near-black
  (it was 9 px in pale purple), and the yield control is a small `⋯` in the panel's top-right corner instead
  of a pill under the card name. It paints above the seat name plates and hand fans, which at upstream's z-index would
  overlap its edge, and below the pass button, notices and every modal.
- **A long stack stays readable.** The panel is always scrolled to its bottom, where the item that resolves next
  sits, and jumps back there whenever something is cast or resolves (scroll up to read an older item and it stays
  put until the stack changes). The cards scrolled away above are pinned to the panel's top edge as thin strips,
  tighter the longer the stack is, so the more you scroll the denser the pile gets, and the panel never takes
  more than 90 px of them.
- **The stack can sit on the right.** **Preferences → Stack position** (*Left*, the default, or *Right*) pins the
  panel to that window edge with the same inset (120 px on a wide window), in Arena and in Classic. The yield menu
  opens on the panel's inward side so it never covers it. Card flights to and from the stack need no special
  case: each frame they read the stack item's on-screen position, so they land on whichever side it is. Stored in
  `localStorage` only (patch 0021; `stackSide.ts` is unit-tested).
- **Tapped lands aren't cut off.** The battlefield slot and the opponent's cell no longer clip at their edge in
  Arena, so a tilted tapped land at the edge of a row shows in full. The same goes for your own board in a
  multi-player table: its cell no longer cuts off cards (a tall land column, say) at its frame.

Arena applies to the two-player board and to multiplayer seats; the stack changes apply whenever Arena is on.
Classic leaves every one of them as upstream draws it.

## Incoming combat damage

While attackers are declared, a small red negative number (for example `-5`) shows beside each defender about to take
damage: a player's name plate or life orb, or the top-right corner of a planeswalker or battle card. It is the sum
of the attackers' power as the server sends it, so pump effects are included. It drops as blocks are declared: an
attacker that gets blocked stops counting, and a defender whose attackers are all blocked loses its number.
It updates live for the defender while they assign blocks, for the attacker watching them, and in spectated games.
It is shown only during the declare attackers and declare blockers steps, so it is gone once combat damage is dealt.

The client does no combat rules: a blocked attacker with trample counts for nothing until the server has assigned its
damage, and until then the number carries a plus (`-2+`, "at least"). Once the server has assigned it, the assigned
amount is used. First strike, double strike and damage-prevention effects are not modelled. Always on, no setting
(patch 0024; `desktop/combat/incomingDamage.ts` is unit-tested, `IncomingDamageBadges.tsx` draws it).

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

## Deck loading indicator

The deck screens (the Library, the Deckbuilder's "My decks" rail and saved-deck browser, and the deck picker in lobbies and games) show a spinner with a label such as "Loading your decks…" while the deck list is still loading, so an empty screen can be told apart from "no decks". Decks already on this computer appear straight away, with a slim "Loading your online decks…" row above them until the account's decks arrive. It is a no-op once loading finishes. Hooked in by patch 0020; the component is `desktop/loading/LoadingIndicator.tsx`.

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

## Updates

Each time the app starts it asks GitHub whether a newer release exists
(`https://github.com/takdiras/argentum-desktop/releases/latest`). If there is one, it downloads and installs it
in the background, then asks whether to restart now or keep playing and pick it up next launch. It never
restarts by itself, so a game in progress isn't cut off. A failed check (offline, no release yet) is ignored.
`bun run dev` never checks.

**Turn it off** in `config.json`, which the app creates with the defaults on first run:

| OS | Location |
|----|----------|
| macOS | `~/Library/Application Support/com.takdiras.argentum-desktop/config.json` |
| Windows | `%APPDATA%\com.takdiras.argentum-desktop\config.json` |
| Linux | `~/.config/com.takdiras.argentum-desktop/config.json` |

```json
{
  "autoUpdate": false
}
```

`autoUpdate` defaults to `true`, including when the key or the whole file is missing. The file is read at
startup, so restart the app after editing it. A file that isn't valid JSON is ignored (defaults apply) and left
as it is, with a `[config]` line in the terminal output.

Updates are verified against the public key in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`); the app
refuses anything not signed with the matching private key. Only the latest **published** release counts, so a
draft is invisible to installed apps until you publish it.

### Publishing a release (maintainers)

One-time setup: add the private key as the repository secret `TAURI_SIGNING_PRIVATE_KEY` (and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if it has a password). Generate a new pair with
`bunx tauri signer generate -w ~/.tauri/argentum-desktop.key`, put the printed public key in
`plugins.updater.pubkey`, and keep the private key out of the repo. **If the key is lost or replaced, apps
already installed can't verify new releases and must be reinstalled by hand.**

Then, per release: bump the version in `src-tauri/tauri.conf.json`, `Cargo.toml` and `package.json`, push a
`vX.Y.Z` tag, wait for the draft release to fill up, and **publish** it. Tag builds additionally produce the
signed update bundles and `latest.json` (`src-tauri/tauri.updater.conf.json` turns that on; local builds and
PRs don't need the key). Apps older than the first release that includes this feature have no updater, so they
need one manual install.

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
