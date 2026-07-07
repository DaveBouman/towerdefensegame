# Game Design Reference

> **For AI agents:** This document describes the active game, design goals, and implementation map. Update this file when gameplay systems change. Do not reference removed tower-defense code — it was deleted as obsolete.

**Last updated:** 2026-07-07

---

## What this game is

A **4×4 card-chain combat** game built with Phaser + React, played across a
branching **run map** (roguelite-style path of battles).

- Player drags cards from hand onto a grid; arrows define activation order.
- Player sets chain start (column 0) and clicks **Attack**.
- Chain resolves step-by-step (attack, defend, fire, poison, joker, loop, hazard, boost).
- Enemy acts with telegraphed intent (attack/shield + hazard traps).
- Win: enemy HP ≤ 0. Lose: player HP ≤ 0.

## Run structure

The game is a **run**: a left-to-right map of battle nodes connected by lines
(`src/game/run/runMap.ts`). The player picks one node per column; enemies ramp
in difficulty toward a boss (`warden`) in the final column.

- **HP carries over** between fights, with a small heal on each victory (`RUN_CONFIG.healOnVictory`).
- Losing any battle, or clearing the boss, ends the run (`RunEndOverlay` → new run).
- The map regenerates each run.

Flow: `map (pick node)` → `battle` → `win → map` / `lose → defeat` / `boss win → victory`.

---

## Architecture (active code only)

```
index.html → src/main.tsx → App.tsx (run controller)
  ├── PhaserGame.tsx → src/game/main.ts → scenes/Game.ts
  ├── GameHud.tsx        (battle phase)
  ├── RunMapOverlay.tsx  (map phase)
  └── RunEndOverlay.tsx  (victory / defeat)
```

`App.tsx` owns run state (map, path, carry-over HP, phase). The Phaser `Game`
scene does **not** auto-start a fight; it waits for `START_BATTLE`, builds a
battle, and emits `BATTLE_WON` / `BATTLE_LOST` back to React.

| Layer | Path | Role |
|-------|------|------|
| Run controller | `src/App.tsx` | Map/battle/end phases, carry-over HP, node picks |
| Run map | `src/game/run/runMap.ts` | Graph generation, reachability, run config |
| Session | `src/game/cardGame/domain/CardGameSession.ts` | Turn flow, board state, combat orchestration (accepts carry-over HP) |
| Combat | `src/game/cardGame/combat/AttackPipeline.ts` | Chain resolution, type streaks, off-chain bonus |
| Enemy AI | `src/game/cardGame/combat/enemyTurn.ts` | Intent, attack/shield, hazard placement |
| Passives | `src/game/cardGame/enemyPassives/` | Per-enemy counter-play |
| Config | `src/game/cardGame/config/` | `gameRules.json`, `cards.json`, `enemies.json` |
| Board UI | `src/game/board/` | Grid, hand, piles, health, armor views |
| React HUD | `src/ui/components/GameHud.tsx` | Attack, reroll controls |
| Map / end UI | `src/ui/components/RunMapOverlay.tsx`, `RunEndOverlay.tsx` | Node picking, run results |
| Event buses | `EventBus` (React↔Phaser shell, incl. `START_BATTLE`/`BATTLE_WON`/`BATTLE_LOST`), `CardGameEventBus` (in-game) |

**Shared config:** `src/game/config/gridConfig.ts` (4×4 board), `uiTypography.ts`.

---

## Core loop

```
Deploy (place cards) → Attack (chain resolve) → Board clears → Enemy turn → New hand + field boost → repeat
```

| Rule | Value | Config |
|------|-------|--------|
| Player HP | 80 | `gameRules.json` |
| Deck / hand | 20 / 10 | `gameRules.json` |
| Rerolls per fight | 3 | `gameRules.json` |
| Chain start column | 0 | `gameRules.json` |
| Max chain steps | 24 | `gameRules.json` |
| Off-chain bonus | +1 damage (attack) / +1 armor (defend) on board but not in chain | `gameRules.json` |
| Type streak | +8% per duplicate attack/defend in streak | `gameRules.json` |
| Field boost | Random boost on empty tile; doubles next chain step | `gameRules.json` |

---

## Tactical systems (implemented)

| System | Files | Player decision |
|--------|-------|-----------------|
| Chain routing | `AttackPipeline.ts`, `cardDirections.ts` | Arrow pools, leap (2-tile), loop-reset |
| Poison trail | `poisonTrailAbility.ts` | Converts subsequent defends to poison damage |
| Fire alternation | `fireAlternationAbility.ts` | +3 damage per alternating attack/defend after fire |
| Hazards/traps | `hazardBehavior.ts` | Disarm in-chain or slot explodes + disables |
| Shield layer | Both sides | Absorbs before HP |
| Enemy passives | `enemyPassives/` | See enemy roster below |

### Enemy roster (`cardGame/config/enemies.json`)

| ID | Counter-play |
|----|--------------|
| `basic` | Raider — baseline, no passives |
| `thornward` | Thorns — reflects 2 damage on attack |
| `saboteur` | Enrage (+2 atk per trap), Silence Tile — punishes long chains / ignored traps |
| `warden` | Wet Blanket (halves fire bonus), Jammer (+5 shield if chain ≥6), Last Stand (≤25% HP: atk 12, 2 traps) |
| `smokebinder` | Smoke (blocks poison trail), Loop Hunter (punishes loop-reset) |

Each enemy should force a **different deck shape and chain strategy**.

---

## Design goals: higher stakes, more tactical

### Principles

1. **Telegraphed threats** — player sees intent and has 1–2 turns to adapt.
2. **Tradeoffs, not correct answers** — long chain vs board coverage, spend rerolls now vs save.
3. **Enemy counters habits** — Jammer vs long chains, Smokebinder vs poison, Thornward vs all-in attack.
4. **Recoverable mistakes** — high stakes, but one bad turn should not auto-lose.

### Recommended roadmap

#### Phase 1 — Stakes (~1–2 weeks)

- [x] **Gauntlet / run map** — branching path of escalating enemies from `enemies.json` (`runMap.ts`, `RunMapOverlay`)
- [x] **Carry-over HP** — HP carries between fights with a small heal on victory (`RUN_CONFIG.healOnVictory`)
- [x] **Pre-fight enemy preview** — map nodes show the enemy label before you commit
- [ ] **Run-wide rerolls** — e.g. 5 per run instead of 3 per fight

#### Phase 2 — Spatial tactics (~1 week)

- [ ] **Column pressure** — enemy targets or disables specific columns
- [ ] **Threshold telegraphs** — HUD shows Last Stand / Enrage breakpoints
- [ ] **Perfect-fight rewards** — bonus reroll or card upgrade for clean wins

#### Phase 3 — Meta (~1–2 weeks)

- [ ] Unlock system (cards, enemies)
- [ ] Daily/weekly seeded challenge
- [ ] Ascension modifiers (+enemy HP, −rerolls, faster enemy turns)

### Anti-patterns (do not reintroduce)

- ~~Tower defense / wave spawning~~ — removed; not part of this game
- ~~Fusion, race adjacency, tower drafts~~ — removed
- ~~Spawn-column tower placement~~ — removed

---

## Key files for common tasks

| Task | Start here |
|------|------------|
| Map layout / difficulty ramp | `src/game/run/runMap.ts` (`ROW_SIZES`, `ROW_ENEMY_POOLS`, `RUN_CONFIG`) |
| Map / run visuals | `src/ui/components/RunMapOverlay.tsx`, `RunEndOverlay.tsx`, `.run-map*` / `.run-end*` in `public/style.css` |
| Run flow (phases, carry-over HP) | `src/App.tsx` |
| Change balance numbers | `src/game/cardGame/config/gameRules.json` |
| Add/edit cards | `src/game/cardGame/config/cards.json`, `cardRegistry.ts` |
| Add/edit enemies | `src/game/cardGame/config/enemies.json`, `enemyCatalog.ts`, `enemyPassives/` |
| Chain behavior | `src/game/cardGame/combat/AttackPipeline.ts` |
| New card ability | `src/game/cardGame/effects/`, `abilities/` |
| Enemy turn logic | `src/game/cardGame/combat/enemyTurn.ts` |
| HUD buttons | `src/ui/components/GameHud.tsx`, `src/game/events/gameEvents.ts` |
| Tooltips | `src/game/cardGame/presentation/tooltips/` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-07 | Added run map: branching node/line overworld between battles (`runMap.ts`, `RunMapOverlay`), carry-over HP with heal-on-victory, victory/defeat run-end screens. Scene now starts/ends battles on `START_BATTLE`/`BATTLE_WON`/`BATTLE_LOST` events. |
| 2026-07-07 | Initial doc. Removed obsolete TD subsystem from codebase. Design focus: card-chain combat only. |
