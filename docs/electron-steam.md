# Desktop release (Electron) and Steam

This project is a web game (Vite + Phaser + React). Shipping on Steam is typically done by wrapping the production build in an Electron shell and integrating Steamworks from the **main process**.

## Build for production

```bash
npm run build
```

Serve the `dist/` output from a static file server, or load `dist/index.html` from Electron with a `file://` or custom protocol URL (adjust Vite `base` if assets break under `file://`).

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

Inject this preload API from Electron (do **not** enable `nodeIntegration` in the renderer):

```js
// preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('signalChainDesktop', {
  quit: () => ipcRenderer.send('app:quit'),
  setFullscreen: (enabled) => ipcRenderer.send('app:fullscreen', enabled),
  getFullscreen: () => ipcRenderer.invoke('app:get-fullscreen'),
  openExternal: (url) => ipcRenderer.send('app:open-external', url),
  platform: process.platform,
});
```

Game-side types live in `src/game/desktop/desktopBridge.ts`. Product title/version: `src/game/meta/gameMeta.ts`.

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

## Suggested packaging order

1. Electron shell that loads `dist/` and implements `signalChainDesktop`.
2. Installer (e.g. electron-builder) for Windows first.
3. Steam depot upload + overlay smoke test.
4. Steamworks achievements / cloud (optional Phase 3).

## Why Chrome in the browser can feel slower than Firefox

Different browsers tune canvas, compositing, and GPU layers differently. Profile with **Performance** in DevTools and reduce per-frame work. The game includes dirty-check optimizations for selection rings and health bars to keep steady frame times.
