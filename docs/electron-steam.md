# Desktop release (Electron) and Steam

This project is a web game (Vite + Phaser). Shipping on Steam is typically done by wrapping the production build in a desktop shell.

## Build for production

```bash
npm run build
```

Serve the `dist/` output from a static file server, or load `dist/index.html` from Electron with a `file://` or custom protocol URL (adjust asset paths if needed; Vite’s default base is `/`).

## Electron checklist

- Use a **release** build in the packaged app; keep **DevTools closed** when profiling performance (Chrome’s renderer is much heavier with devtools attached).
- Prefer `BrowserWindow` options that match a game: fullscreen/borderless, disable unnecessary background throttling if you need consistent `requestAnimationFrame` (evaluate per title).
- `app.commandLine.appendSwitch('disable-background-timer-throttling')` is sometimes used for games; test idle/pause behavior before relying on it.
- Leave **hardware acceleration** on unless you have a documented GPU bug on specific drivers.
- For Steam overlay and input hooks, test early on **Windows** (primary Steam audience).

## Steam

- Steam accepts **Windows/macOS/Linux** executables; an **Electron** app is a normal desktop app with a Chromium renderer.
- For achievements, cloud saves, and multiplayer identity you integrate **Steamworks** (often via `greenworks`, `steamworks.js`, or similar native addons). Plan architecture before you depend on Steam-only APIs in the renderer vs main process.
- Steam documentation: [Steamworks](https://partner.steamgames.com/doc/home) (partner account required for full docs).

## Why Chrome in the browser can feel slower than Firefox

Different browsers tune canvas, compositing, and GPU layers differently. Profile with **Performance** in DevTools and reduce per-frame work (redundant `Graphics` redraws, unnecessary `setPosition` / style updates). The game includes several “dirty check” optimizations for selection rings and health bars to keep steady frame times.
