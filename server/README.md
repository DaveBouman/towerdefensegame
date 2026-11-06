# Signal Chain — authoritative auto-battler server

Battles, shop RNG, gold, and AI opponents are simulated **only here**.
Clients send intents (`shop_buy`, `end_turn`, …) and render `state` snapshots.

## Run

```bash
npm run server
```

Default: `ws://127.0.0.1:8787` (`AB_WS_PORT` to override).

In another terminal:

```bash
npm run dev
```

Optional: `VITE_AB_WS_URL=ws://127.0.0.1:8787`

## Protocol

See `src/game/autoBattler/net/protocol.ts`.

- **vs AI:** `start_vs_ai` → shop intents → `end_turn` (server runs AI + `simulateBattle`) → `battle_continue`
- **1v1:** `queue_pvp` → match when two guests connect → both shop → both `end_turn` → server battles → `battle_continue`
