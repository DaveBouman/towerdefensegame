# Steam store art (generated)

Procedural banner/capsule art for the Steam partner upload flow.

Regenerate:

```bash
npm run generate-steam-art
```

## Files

| File | Size | Steam use |
|------|------|-----------|
| `capsule-header.png` | 460×215 | Store header capsule |
| `capsule-main.png` | 616×353 | Main store capsule |
| `capsule-small.png` | 231×87 | Small capsule / widgets |
| `library-header.png` | 920×430 | Library header |
| `library-hero.png` | 3840×1240 | Library hero |
| `library-logo.png` | 1280×720 | Library logo (text on transparent) |

SVG sources are kept alongside PNG exports for manual tweaks in Figma/Inkscape. PNGs are rasterized with the same Orbitron/Rajdhani fonts as the SVG (via `@resvg/resvg-js`), not system fallbacks.

Edit `scripts/generate-steam-art.mjs` to change colors, tagline, or layout.
