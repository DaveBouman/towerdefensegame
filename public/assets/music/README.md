# Background music

| File | Track key | When it plays |
|------|-----------|---------------|
| `glass-streets-at-midnight.mp3` | `glass-streets` | Run map, shops, events, rewards, rest |
| `concrete-veins.mp3` | `concrete-veins` | Standard battles / puzzles (alternates with Iron Gait) |
| `iron-gait.mp3` | `iron-gait` | Standard battles / puzzles (alternates with Concrete Veins) |
| `last-gatekeeper.mp3` | `last-gatekeeper` | Warden intro and final boss fight |

Tracks crossfade (~1.4s) when switching between exploration and combat. Standard fights alternate `concrete-veins` / `iron-gait` by path length so map↔battle transitions feel less samey. The mute button controls both music and SFX.

Files are **tail-trimmed** (last ~5s removed) so loops stay tight — re-run `npm run trim-bgm` after replacing MP3s.

Replace files here keeping the same names, or update `src/game/audio/bgmManifest.ts`.
