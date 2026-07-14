# Game Design Reference

> **For AI agents:** This document describes the active game, design goals, and implementation map. Update this file when gameplay systems change. Do not reference removed tower-defense code — it was deleted as obsolete.

**Last updated:** 2026-07-14

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

The game is a **run**: a left-to-right map of nodes connected by lines
(`src/game/run/runMap.ts`). The player picks one node per column; enemies ramp
in difficulty toward a boss (`warden`) in the final column.

- **Node kinds** (`src/game/run/nodeKinds.ts`, `RunMapNode.kind`): `enemy` and `boss`
  are battles; `shop` and `event` are non-battle stops. Each kind has an icon
  (`NodeKindIcon`, from game-icons.net) and a hover tooltip on the map. First column
  is always `event` (for testing); last column is the `boss`; middle columns are weighted-random
  (`rollNodeKind`). **Event nodes** open `RunEventOverlay` (`runEvents.ts`) — wheel,
  icon matcher (4×4 memory grid, 4 attempts), **combo trials** (damage puzzles), healing, gambles, trinkets. Shop is still a placeholder (`NodeVisitOverlay`).
- **HP carries over** between fights, with a small heal on each victory (`RUN_CONFIG.healOnVictory`).
- **Deck persists and grows**: the run owns the deck as a list of card definition ids (`getDefaultDeckDefinitionIds`). Each battle builds instances from those ids (`buildDeckFromDefinitionIds`).
- **Victory rewards**: defeating a (non-boss) enemy grants that node's reward. Today every node grants a **card reward** (`CardRewardOverlay` → pick from choices → card ids appended to the run deck).
- Losing any battle, or clearing the boss, ends the run (`RunEndOverlay` → new run).
- The map regenerates each run.

Flow: `map (pick node)` → `battle` → `win → reward → map` / `lose → defeat` / `boss win → victory`.
Non-battle nodes: `map (pick shop)` → `visit` → `map`; `map (pick event)` → `visit (RunEventOverlay)` → `map`.

### Seeds & determinism

Runs are **seed-based**: the same seed produces the same map and the same rewards,
and the same seed + same in-battle actions produces the same battle.

- All gameplay randomness routes through a single seeded RNG (`src/game/random/rng.ts`,
  mulberry32 + xmur3). **Never call `Math.random()` in gameplay code** — use `random()`,
  `randomInt()`, `pickRandom()`, or `shuffleInPlace()` from that module. (`Math.random`
  is used only inside `createRandomSeed` to pick a fresh unpredictable seed.)
- The RNG is **reseeded at deterministic boundaries** via `seedScope(seed, scope)` /
  `deriveSeed(seed, scope)`:
  - `map` — map generation (`App.buildMapForSeed`)
  - `reward:<nodeId>:<rerollIndex>` — a node's card reward (`App.rollRewardForNode`)
  - `battle:<nodeId>` — a battle's stream, reseeded in `Game.startBattle` (passed via
    the `START_BATTLE` payload `seed`)
- Because each boundary reseeds, map/reward results are **idempotent and order-independent**
  (robust to React StrictMode double-invocation); battles are reproducible given the same
  player actions (actions consume the battle stream in order).
- The player can view/enter the seed on the map before the first battle (`RunMapOverlay`).

### Rewards (variable, extensible)

Rewards are data on each map node (`RunMapNode.reward`), modeled as a discriminated
union in `src/game/run/rewards.ts`:

```
RunReward = CardReward { kind: 'card'; choiceCount; pickCount; rerollable }
```

- **Variable per node** — different enemies can grant different rewards; today all use `DEFAULT_CARD_REWARD`.
- **Trinket-ready** — the numeric knobs are the intended extension seam:
  - `pickCount > 1` → "pick two cards"
  - `rerollable: true` → reroll the offered choices (`CardRewardOverlay` already renders the button + `App` handles reroll)
  - add new `RunReward` kinds (e.g. trinket/gold) without touching existing handling.
- Card choices come from `REWARD_CARD_POOL` via `rollCardReward(choiceCount)`.

When adding trinkets: give trinkets a modifier step that adjusts the `RunReward`
before `rollCardReward`/display, or add a new `RunReward` kind + a case in `App`'s
`onBattleWon`.

---

## Architecture (active code only)

```
index.html → src/main.tsx → App.tsx (run controller)
  ├── PhaserGame.tsx → src/game/main.ts → scenes/Game.ts
  ├── GameHud.tsx           (battle phase)
  ├── RunMapOverlay.tsx     (map phase; node icons + tooltips)
  ├── CardRewardOverlay.tsx (reward phase)
  ├── NodeVisitOverlay.tsx  (visit phase; shop/event placeholder)
  └── RunEndOverlay.tsx     (victory / defeat)
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
Deploy → Attack (chain resolve, board KEPT, costs 1 energy, hand refills) → repeat while energy remains → energy = 0 → Board clears → Enemy turn → New hand + field boost → repeat
```

The player turn is **escalating**: each Attack resolves the whole board and leaves the cards in place, so the next Attack chains through a longer, harder-hitting sequence. Between attacks the hand tops back up to full, letting the deck progress mid-turn. Each Attack spends one **energy** (`energyPerTurn`, default 3); when **all** energy is spent the board is discarded and the enemy acts once. The Dead Zone (dampen) field now expires at end of turn rather than per attack.

**Risk/reward:** the first attack of a round is baseline, but every *extra* attack ramps the enemy's incoming attack damage by `enemyDamageRampPerAttack` (default 4). The enemy intent re-telegraphs the ramped number live as you attack, so chaining more attacks trades bigger combos for a harder hit back.

| Rule | Value | Config |
|------|-------|--------|
| Player HP | 80 | `gameRules.json` |
| Deck / hand | 20 / 8 | `gameRules.json` |
| Energy (attacks) per turn | 3 | `gameRules.json` (`energyPerTurn`) |
| Enemy damage ramp per extra attack | +4 | `gameRules.json` (`enemyDamageRampPerAttack`) |
| Rerolls per fight | 3 | `gameRules.json` |
| Chain start column | 0 | `gameRules.json` |
| Max chain steps | 24 | `gameRules.json` |
| Off-chain bonus | +2 damage (attack) / +2 armor (defend) on board but not in chain | `gameRules.json` |
| Type streak | +15% per duplicate attack/defend in streak | `gameRules.json` |
| Field boost | Random boost on empty tile; doubles next chain step | `gameRules.json` |
| Resolution speed | Chain step 800ms, enemy turn 800ms (snappy) | `gameRules.json` |

---

## Tactical systems (implemented)

| System | Files | Player decision |
|--------|-------|-----------------|
| Chain routing | `AttackPipeline.ts`, `cardDirections.ts` | Arrow pools, leap (2-tile), loop-reset, corner-turn (`cornerTurn` — hooks to a forward-diagonal, `getCornerNextSlot`) |
| Poison trail | `poisonTrailAbility.ts` | Converts subsequent defends to **poison stacks** on the enemy |
| Poison stacks (status) | `CardGameSession.tickPoison` | Enemy takes `stacks` damage at the start of each of its turns (ignores shield), then stacks decay by 1 |
| Fire alternation | `fireAlternationAbility.ts` | +3 damage per alternating attack/defend after fire |
| Bleed (Rupture) | `bleedAbility.ts` | +2 damage per attack in the chain beyond 2 (rewards attack-heavy chains) |
| Fortify (Bulwark) | `fortifyAbility.ts` | +2 armor per defend in the chain beyond 2 (rewards defend-heavy chains) |
| Overload (Surge) | `overloadAbility.ts` | +3 damage per other skill card in the chain, doubled if a Joker activates |
| Hazards/traps | `hazardBehavior.ts`, `AttackPipeline.applyBombConversion` | Skip → slot explodes (4 dmg) + disables; **route a card into it → the trap converts to that card's type** (attack→attack for its power, defend→armor) and joins streaks/abilities |
| **Curse cards** | `cards.json` (`unplayable`, `handEndPenalty`), `CardGameSession.resolveHandEndPenalties` | Bad cards that clog the hand — **Burden** (unplayable, 5 dmg if held at end of turn), **Fuse** (weak attack, 8 dmg if not placed by end of turn). **Saboteur** adds Burdens via `curseHand` passive |
| Shield layer | Both sides | Absorbs before HP (poison bypasses shield) |
| Enemy passives | `enemyPassives/` | See enemy roster below |

### Enemy roster (`cardGame/config/enemies.json`)

| ID | Counter-play |
|----|--------------|
| `basic` | Raider — baseline (HP 190, atk 13, 65% attack), no passives |
| `thornward` | Thorns — reflects 4 damage on attack (punishes multi-attack re-firing) |
| `saboteur` | Enrage (+3 atk per trap), Escalate (ramps traps +1/turn up to 4), Silence Tile, **Curse Hand** (adds Burden to hand each turn) — trap pressure snowballs |
| `warden` | Wet Blanket (halves fire bonus), Jammer (+5 shield if chain ≥6), Last Stand (≤25% HP: atk 12, 2 traps) |
| `smokebinder` | Smoke (blocks poison stacks), Loop Hunter (punishes loop-reset), Dead Zone (telegraphed event: every 2 turns, cards on even checkerboard tiles deal half damage/armor next turn) |

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
- [x] **Node kinds** — enemy/boss/shop/event nodes with icons + hover tooltips (`nodeKinds.ts`, `NodeKindIcon`); shop/event are placeholders (`NodeVisitOverlay`)
- [ ] **Shop node** — spend a run currency on cards/trinkets (replace `NodeVisitOverlay` placeholder)
- [ ] **Random event node** — branching choice encounters (replace `NodeVisitOverlay` placeholder)
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
| Seeded RNG / determinism | `src/game/random/rng.ts` (use `random`/`randomInt`/`pickRandom`/`shuffleInPlace`, never `Math.random`) |
| Map layout / difficulty ramp | `src/game/run/runMap.ts` (`ROW_SIZES`, `ROW_ENEMY_POOLS`, `RUN_CONFIG`) |
| Map node kinds / icons / tooltips | `src/game/run/nodeKinds.ts` (kinds, weights, tooltip copy), `src/ui/components/NodeKindIcon.tsx` |
| Shop / event node behavior | `src/ui/components/NodeVisitOverlay.tsx` (placeholder), `RunEventOverlay.tsx`, `runEvents.ts`, `runPuzzles.ts`, `PuzzleHud.tsx`, `PuzzleResultOverlay.tsx`; `App.tsx` `visit`/`puzzle` phases |
| Rewards / reward pool / trinket hooks | `src/game/run/rewards.ts` |
| Persistent run deck | `getDefaultDeckDefinitionIds` / `buildDeckFromDefinitionIds` in `buildPlayerDeck.ts` |
| Map / run visuals | `src/ui/components/RunMapOverlay.tsx`, `RunEndOverlay.tsx`, `CardRewardOverlay.tsx`; `.run-map*` / `.run-end*` / `.card-reward*` in `public/style.css` |
| Run flow (phases, carry-over HP, deck, rewards) | `src/App.tsx` |
| Change balance numbers | `src/game/cardGame/config/gameRules.json` |
| Add/edit cards | `src/game/cardGame/config/cards.json`, `cardRegistry.ts` |
| Add/edit enemies | `src/game/cardGame/config/enemies.json`, `enemyCatalog.ts`, `enemyPassives/` |
| Chain behavior | `src/game/cardGame/combat/AttackPipeline.ts` |
| New card ability | `src/game/cardGame/effects/` (behaviors), `abilities/` (chain abilities: poison/fire/bleed/fortify/overload) + register in `chainAbilityRegistry.ts` |
| Bomb / trap conversion | `AttackPipeline.applyBombConversion` (runs first in `resolveChainSteps`) |
| Enemy poison status | `CardGameSession.tickPoison`/`applyPoisonStacks` (via `abilityPoisonStacks`), display in `EnemyTargetView.setPoison` |
| Enemy turn logic | `src/game/cardGame/combat/enemyTurn.ts` |
| HUD buttons | `src/ui/components/GameHud.tsx`, `src/game/events/gameEvents.ts` |
| Tooltips | `src/game/cardGame/presentation/tooltips/` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-14 | **Sign Matcher memory game.** Sign Matcher is now a 4×4 (16-tile) picture-matching minigame: eight icon pairs, flip two per attempt, **4 attempts** to match as many pairs as possible. Rewards scale with pairs matched (gold tiers; 3+ pairs adds a card with gold/HP costs; 0 pairs deals damage). Seeded grid via `buildIconMatchGrid`. |
| 2026-07-14 | **Courier + exhaust cards + smaller hand.** **Courier** discards up to 2 cards from the left of hand into the graveyard when played (includes unplayable curse cards). New `discardFromHandOnPlay` and `exhaustOnPlay` on `CardDefinition` — exhaust cards are destroyed instead of entering the discard pile and one copy is removed from the run deck on victory. Courier is single-use per run. Starting hand **8** (`gameRules.handSize`). |
| 2026-07-14 | **Corner Defense readability.** Single arrow tucked in the card corner (no dual hook preview); tooltip copy simplified. Corner Strike keeps the hook preview. |
| 2026-07-14 | **Player round gating.** Board persists and the enemy does not act until **all** energy is spent. Manual End Turn removed (it was ending the round early). `endPlayerRound` runs only when `energy === 0` → graveyard animation → `clearBoard` → single enemy turn. |
| 2026-07-14 | **Escalating turn fix.** Player round splits per-attack cleanup (`releaseAttackLock`, hand refill, board persists) from end-of-round (`endPlayerRound` → graveyard → `clearBoard` → enemy). Attack animation guarded against double-resolve. |
| 2026-07-14 | **Event trade-offs.** Every positive event outcome now pairs with a cost (`lose-gold` caps at current gold; HP damage or curse cards for other rewards). Healing Spring: +18 HP / −18 gold. Wheel: spin costs 5 gold; gold/heal/card/trinket segments also cost HP, gold, or Burden. Sign Matcher win costs 12 gold. Gambler coin and Cursed Idol smash cost HP. Combo Trial success pays mirror gold costs and curse tax on bonus cards. |
| 2026-07-14 | **Combo Trial events.** New **Combo Trial** random event launches a seeded damage puzzle (`runPuzzles.ts`, `START_PUZZLE` / `PUZZLE_RESOLVED`). Player receives a fixed hand of combo cards against a **Training Dummy** (`training-dummy` enemy, no counterattack) and must deal at least the target damage in **one attack**. Six puzzles teach Boost, attack streaks, Strike loops, Fire alternation, Loop Reset, and Rupture bleed. Success grants gold/cards; failure costs a little HP. Puzzle UI: brief screen in `RunEventOverlay`, in-fight goal/hint in `PuzzleHud`, result in `PuzzleResultOverlay`. |
| 2026-07-14 | **Random run events.** Map `event` nodes now open `RunEventOverlay` with seeded encounters (`runEvents.ts`, `seedScope(seed, event:<nodeId>)`). Five events: **Wheel of Fate** (spin for gold/card/curse/trinket/heal/trap), **Sign Matcher** (pick the duplicated icon — card or damage), **Healing Spring**, **Cursed Idol** (trinket + Burden or gold), **Gambler's Offer** (HP for card or gold). First map column is now **all events** for easy testing. Run resources: **gold** + **trinkets** (`trinkets.ts`, `runResources.ts`) shown on the map; trinkets pass into battles (`START_BATTLE.trinkets`) — Vitality Charm (+10 max HP), Energy Cell (+1 energy/turn), Lucky Pouch (+8 gold on victory). Shop nodes remain a placeholder (`NodeVisitOverlay` shows gold). |
| 2026-07-14 | **Curse / bad cards.** New card flags `unplayable` and `handEndPenalty` on `CardDefinition`. **Burden** — cannot be played, deals 5 damage if still in hand when the turn ends. **Fuse** — weak attack (power 2) that must be placed before end of turn or deals 8 damage. Penalties resolve in `CardGameSession.resolveHandEndPenalties` at end of player turn (`Game.resolveEnemyPhase`). Unplayable cards blocked in `placeCardFromHand` and `CardHandView` drag. New `curse` behavior (inert on board). **Saboteur** gains `curseHand` passive — slips 1 Burden into your hand after each enemy turn (can exceed hand size). |
| 2026-07-07 | **Escalation risk/reward: enemy damage ramps with attacks per round.** Each extra attack the player makes in a round increases the enemy's next attack damage by `gameRules.enemyDamageRampPerAttack` (default 4; first attack is baseline). Ramp derives from spent energy (`CardGameSession.getAttacksThisRound` = `maxEnergy − energy`, `getEnemyDamageRamp`), is baked into attack steps at resolve time (`beginEnemyTurn` → `rampEnemyAction`), and is telegraphed live: after each attack `Game.onAttackResolved` re-shows the scaled intent (`getScaledEnemyIntent`). Attack intent tooltip notes the ramp. |
| 2026-07-07 | **Enemy balance pass for the escalating turn** (`enemies.json`). Since a turn now lands up to `energyPerTurn` re-firing attacks, enemy `maxHealth` scaled ~2.3× (Raider 80→190, Thornward 72→170, Saboteur 64→150, Warden 95→220, Smokebinder 78→185) with moderate `attackDamage`/`shieldGain`/`attackChance` bumps so escalating shields don't trivialize them. Thornward's reflect 3→4 and Warden's high shield/Jammer act as natural counters to multi-attack re-firing. Tunable per taste. |
| 2026-07-07 | **Escalating turn / dynamic play.** A player turn is no longer one-and-done: Attack now resolves the board **without clearing it**, so cards stay and each subsequent Attack chains through a longer, escalating sequence. Each Attack costs **1 energy** (`gameRules.energyPerTurn`, default 3, on `GameRules`); the hand refills to full after every attack (`CardGameSession.refillHand`) so the deck progresses mid-turn. New **End Turn** button (`GAME_EVENTS.END_TURN`) — or running out of energy — discards the board and hands off to the enemy (`Game.onEndTurn` → `resolveEnemyPhase`, formerly the post-attack path). Energy state (`getEnergy`/`getMaxEnergy`/`hasEnergy`/`spendEnergy`, reset each turn in `completeEnemyTurn`) surfaces via `GAME_EVENTS.TURN_STATE` → HUD energy pips + End Turn button (`GameHud`, `TurnState`). New readiness reason `no-energy`. Board edits are locked during end-turn resolution via a `turnResolving` guard in `Game`. Dead Zone/dampen now ages once per turn (`CardGameSession.tickDampenField`, called in `resolveEnemyPhase`) instead of per attack. |
| 2026-07-07 | **Pile inspection:** the Deck and Graveyard piles are now clickable (`CardPileView.setClickHandler`, hover highlight). Clicking emits `pile-view-open` (`GAME_EVENTS.PILE_VIEW_OPEN`) with grouped card entries built in `Game.openPileView` from `CardGameSession.getDeckDefinitionIds`/`getDiscardDefinitionIds`. A React modal (`PileViewOverlay`, mounted in `App`) shows the cards grouped by type with counts and power, colored by behavior (`CARD_VISUALS`). Draw order is intentionally hidden (grouped/sorted) to avoid leaking upcoming draws. Closes on backdrop click / × / Escape. |
| 2026-07-07 | New **corner-turn** cards **Corner Strike** (attack, power 6) and **Corner Defense** (defend, power 5) in `cards.json`, flagged `cornerTurn` (`CardDefinition`). The chain steps one tile along the orthogonal arrow then hooks 90° to a forward-diagonal tile, taking whichever side holds a card (fixed order → seed-deterministic) via `AttackPipeline.getCornerNextSlot` + `cardDirections.cornerTargetDirections`; wired into `planActivationChain` and `getNextChainSlotFromStep`. Card shows both hook glyphs (`CardRenderer`), has tooltips, and is added to `REWARD_CARD_POOL`. |
| 2026-07-07 | Enemy traps now spread out: `CardGameSession.placeEnemyHazard` prefers empty tiles that are not orthogonally/diagonally adjacent to an existing trap, falling back to any empty tile on a crowded board. |
| 2026-07-07 | **Dead Zone is now a telegraphed enemy event** (not a permanent passive). The `dampenTiles` ability gains `everyTurns` (cadence) + `duration`; `planEnemyTurnWithPassives` emits a `dampen-field` turn step (new `EnemyTurnKind`) on cadence turns, shown in the enemy intent (icon `empty-chessboard`, tooltip, visual). Resolving it calls `CardGameSession.activateDampenField`, which stores a `dampenField` (parity/multiplier/turnsRemaining). While active, `buildAttackSequence` runs `applyTileDampening` (halves damage/armor of cards on the checkerboard tiles, re-deriving `steps`/`totalDamage`); the field ticks down and expires in `completeAttack`. Weakened tiles are highlighted via `CardBoardView.setDampenedSlots` / `getDampenedSlots`. It is surfaced only through the turn intent (filtered out of the passive-icon row in `EnemyTargetView`). Added to `smokebinder`. |
| 2026-07-07 | New enemy passive **Escalate** (`enemyPassives/types.ts`, `defaults.ts`): each enemy turn ramps the traps placed next turn by `trapsPerRamp` (default +1) up to `maxTraps` (default 4). A per-battle turn counter (`enemyTurnsTaken`, passed to planning as `turnsTaken`) lives in `CardGameSession` and increments per completed enemy turn; planning + cap in `planEnemyTurnWithPassives`. Wired icon (`minefield`), tooltip, label, color. Added to `saboteur` (its Enrage extra-traps set to 0 so the ramp is the single trap source). |
| 2026-07-07 | Battle engagement pass. **Tier 1:** raised enemy pressure (`enemies.json` — higher atk/attack-chance, thorns 3, enrage +3), buffed streaks (+15%/dup) and off-chain (+2), sped up resolution (chain/enemy step 800ms), scaled traps (power 4). **Tier 2:** new chain abilities Bleed/Fortify/Overload with reward cards Rupture/Bulwark/Surge (`bleedAbility`/`fortifyAbility`/`overloadAbility`, `cards.json`, `REWARD_CARD_POOL`). **Poison rework:** poison now applies *stacks* to the enemy (`EnemyState.poison`) that deal damage at the start of each enemy turn (ignoring shield) then decay by 1 (`CardGameSession.tickPoison`); `abilityPoisonStacks` flows through the pipeline; smoke suppresses stacks; shown via `EnemyTargetView.setPoison`; poison can kill during the enemy turn (win handled in `Game`). **Bomb conversion:** a card that chains into a trap converts it to that card's type (`AttackPipeline.applyBombConversion`), so it deals attack/armor for the trap's power and joins streaks/abilities. |
| 2026-07-07 | Map node kinds: nodes are now `enemy`/`boss`/`shop`/`event` (`nodeKinds.ts`) with distinct icons (`NodeKindIcon`) and hover tooltips (`RunMapOverlay`). Shop/event are non-battle placeholders (`NodeVisitOverlay`, `App` phase `visit`) that advance the path. `RunMapNode.enemyId`/`reward` are now battle-only (optional). |
| 2026-07-07 | Seed-based runs: all randomness routes through a seeded RNG (`random/rng.ts`), reseeded at deterministic boundaries (map / reward / battle). Same seed → same map & rewards; same seed + actions → same battle. Seed viewable/editable on the map before the first fight. |
| 2026-07-07 | Added victory rewards: defeating an enemy grants a card (`rewards.ts`, `CardRewardOverlay`). Run now owns a persistent, growing deck (card ids) passed into each battle. Rewards are variable per node and structured for future trinkets (`pickCount`, `rerollable`, new `RunReward` kinds). |
| 2026-07-07 | Added run map: branching node/line overworld between battles (`runMap.ts`, `RunMapOverlay`), carry-over HP with heal-on-victory, victory/defeat run-end screens. Scene now starts/ends battles on `START_BATTLE`/`BATTLE_WON`/`BATTLE_LOST` events. |
| 2026-07-07 | Initial doc. Removed obsolete TD subsystem from codebase. Design focus: card-chain combat only. |
