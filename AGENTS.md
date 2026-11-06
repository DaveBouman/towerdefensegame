# Agent instructions

## Project

Super Auto Pets–style cyberpunk auto battler with a hard client/server split. See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

- **Client-safe:** `src/game/autoBattler/shared/` + `client/` (via `src/game/autoBattler/index.ts`)
- **Server-only:** `src/game/autoBattler/{battle,shop,ai,run}/` + `server/` — never import from UI
- Vite enforces the boundary (`vite/blockServerAutoBattler.mjs`)

Do not trust client-side battle/shop outcomes. Legacy card-chain under `src/game/cardGame/` is not the App entry.

## Do not use

Tower-defense code was removed. Ignore any external references to towers, waves, fusion, race drafts, or targeting modes.

## After gameplay changes

Update `docs/GAME_DESIGN.md` (especially the changelog and roadmap).
