# Background music

| File | Track key | When it plays |
|------|-----------|---------------|
| `glass-streets-at-midnight.mp3` | `glass-streets` | Run map, shops, events, rewards, rest |
| `concrete-veins.mp3` | `concrete-veins` | Standard battles, lieutenant fights, puzzles |
| `last-gatekeeper.mp3` | `last-gatekeeper` | Warden intro and final boss fight |

Tracks crossfade (~1.4s) when switching between exploration and combat. The mute button controls both music and SFX.

Loop playback skips the last **1 second** of each file at runtime (see `BGM_LOOP_TRIM_SEC` in `bgmManifest.ts`) so tails/outros do not break the loop. To permanently trim files, cut 1s from the end in a DAW and replace these MP3s.

Replace files here keeping the same names, or update `src/game/audio/bgmManifest.ts`.
