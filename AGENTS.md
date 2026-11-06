# Agent instructions

## Project

Super Auto Pets–style cyberpunk auto battler with an **authoritative WebSocket server** (`npm run server`) and thin React client. See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

Shared domain: `src/game/autoBattler/`. Server: `server/`. UI: `src/ui/autoBattler/`. Do not trust client-side battle/shop outcomes. Legacy card-chain code under `src/game/cardGame/` is not the App entry.

## Do not use

Tower-defense code was removed. Ignore any external references to towers, waves, fusion, race drafts, or targeting modes.

## After gameplay changes

Update `docs/GAME_DESIGN.md` (especially the changelog and roadmap).
