# Signal Chain — authoritative auto-battler server

**Authority lives here.** Clients send intents and render stripped snapshots.
They never decide gold, shop rolls, AI teams, or battle winners.

## Boundary

| Layer | Path | Role |
|-------|------|------|
| Shared (client-safe) | `src/game/autoBattler/shared/` | Protocol, public rules labels, unit catalog, empty view |
| Client socket | `src/game/autoBattler/client/` | WebSocket only |
| Server domain | `src/game/autoBattler/{battle,shop,ai,run}/` | Sim + mutations |
| View builder (server-only) | `src/game/autoBattler/serverOnly/` | Stripped `ClientRunView` |
| Host | `server/` | WS sessions, matchmaking |

Vite blocks UI imports of server domain modules (`vite/blockServerAutoBattler.mjs`).

## Run

```bash
npm run server
npm run dev
```

Default: `ws://127.0.0.1:8787` (`AB_WS_PORT`, `VITE_AB_WS_URL`).

## Protocol

`src/game/autoBattler/shared/protocol.ts`

- Welcome includes `rules` (buy/sell/reroll costs for UI).
- State snapshots omit run seed and enemy shop/gold.
- Battle logs have seeds stripped.
- PvP: both players `end_turn`, then both `battle_continue` before the ladder advances.
