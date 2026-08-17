# Desktop release (Electron) and Steam

This project is a web game (Vite + Phaser + React). Shipping on Steam is done by wrapping the production build in the Electron shell under `electron/` and integrating Steamworks from the **main process**.

## Quick start (desktop)

```bash
# Production build + launch Electron (loads dist/index.html)
npm run electron:start

# Dev: run Vite in one terminal, Electron in another
npm run dev-nolog
npm run electron:dev

# Windows installer (after `npm run build`)
npm run dist:win
```

Installers land in `release/`. Vite already uses `base: './'`, so relative asset paths work under `file://`.

### Steam dev setup

1. Copy `steam_appid.txt.example` → `steam_appid.txt` (480 = Spacewar test app, or your real App ID).
2. Install optional native dep: `npm install steamworks.js` (also listed in `optionalDependencies`).
3. Launch Steam client, then `npm run electron:start`.
4. Settings → **Steam → Steam portraits** should enable your runner avatar when init succeeds.

Friend avatars for enemies still need `ISteamFriends` support in steamworks.js ([upstream issue](https://github.com/ceifa/steamworks.js/issues/169)); until then enemies use Craftpix portraits.

## Build for production

```bash
npm run build
```

Serve the `dist/` output from a static file server, or load it from Electron via the registered `app://` protocol (see `electron/main.cjs`). The production build uses Vite `base: './'`; the custom protocol avoids `file://` quirks with Phaser audio loading.

## Main menu contracts (already in game)

The React main menu is Steam/desktop-ready:

| Action | Behavior |
|--------|----------|
| **Start run** | Begins a seeded run |
| **Card index** | Collection unlock archive |
| **Settings** | Master/Music/SFX, text size (S/M/L), fullscreen, replay tutorial tips |
| **Start / New run** | Seed input + randomize, then begin (`resetRun` with that seed) |
| **In-run MENU** | Pause overlay (Resume / New run with confirm + seed / Settings / Card index). |
| **How to play** | Short rules |
| **Credits** | Attribution |
| **Quit** | Calls `window.signalChainDesktop.quit()` when present; otherwise `window.close()` |

Inject this preload API from Electron (do **not** enable `nodeIntegration` in the renderer). Implemented in `electron/preload.cjs` + `electron/main.cjs`:

Game-side types live in `src/game/desktop/desktopBridge.ts`. Product title/version: `src/game/meta/gameMeta.ts` (`GAME_VERSION` is injected from `package.json` when Vite builds or runs dev).

## Electron checklist

- Use a **release** build in the packaged app; keep **DevTools closed** when profiling performance.
- Prefer `BrowserWindow` options that match a game: fullscreen/borderless, consistent frame pacing.
- `app.commandLine.appendSwitch('disable-background-timer-throttling')` is sometimes used for games; test idle/pause behavior first.
- Leave **hardware acceleration** on unless you have a documented GPU bug.
- Wire **Quit** / fullscreen IPC early so Steam Big Picture and Alt+F4 behave correctly.
- For Steam overlay and input hooks, test early on **Windows** (primary Steam audience).

## Steam

- Steam accepts **Windows/macOS/Linux** executables; an Electron app is a normal desktop app with a Chromium renderer.
- Achievements, cloud saves, and rich presence go through **Steamworks** (often `steamworks.js` / similar) in the **main process**, then optional IPC to the renderer.
- Persist run meta (card collection, audio, tutorial flag) already uses `localStorage` — map that to Steam Cloud files when you package.
- Steam documentation: [Steamworks](https://partner.steamgames.com/doc/home) (partner account required for full docs).

### Street faces (avatars in combat)

The web build cannot read Steam friends. Once the Electron shell talks to Steamworks in the **main process**, combat portraits light up:

| Portrait | Source | Fallback |
|----------|--------|----------|
| Runner | Local Steam avatar + persona name | Diamond glyph / `RUNNER` |
| Enemies | Friends' avatars (not you), picked per enemy id from the battle seed | Craftpix portraits |

IPC payload for each persona:

```ts
{ steamId: string; personaName: string; avatarUrl: string }
```

`avatarUrl` may be a `data:image/png;base64,...` from `ISteamFriends.GetImageRGBA`, or a Steam CDN URL. Main-process sketch:

1. `ISteamUser.GetSteamID` + `GetLargeFriendAvatar` / `GetPersonaName` for the local player.
2. `ISteamFriends.GetFriendCount(k_EFriendFlagImmediate)` + `GetFriendByIndex` for friends.
3. Convert image handles to PNG data URLs (avoids renderer CORS).
4. If Steam is not running, return `isAvailable: false` — the game keeps Craftpix art.

Settings → **Steam → Steam portraits** toggles this (on by default; stored in `localStorage`). Assignment is visual-only and does not touch the gameplay RNG.

## Suggested packaging order

1. ~~Electron shell that loads `dist/` and implements `signalChainDesktop`.~~ **Done** — `electron/main.cjs`, `electron/preload.cjs`, npm scripts.
2. ~~Installer (electron-builder) for Windows first.~~ **Done** — `npm run dist:win` (also mac/linux targets).
4. Settings → **Window size** for fixed 16:9 presets or Adaptive letterboxing (desktop only).
5. Steam depot upload + overlay smoke test (manual — partner account + App ID).
6. Steamworks friends IPC + achievements / cloud (optional Phase 3).

## Why Chrome in the browser can feel slower than Firefox

Different browsers tune canvas, compositing, and GPU layers differently. Profile with **Performance** in DevTools and reduce per-frame work. The game includes dirty-check optimizations for selection rings and health bars to keep steady frame times.
