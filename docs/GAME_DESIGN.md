# Game Design Reference

> **For AI agents:** This document describes the active game, design goals, and implementation map. Update this file when gameplay systems change. Do not reference removed tower-defense code — it was deleted as obsolete.

**Last updated:** 2026-08-13

---

## What this game is

A **5×5 card-chain combat** game built with Phaser + React, played across a
branching **run map** (roguelite-style path of battles).

- Player drags cards from hand onto a grid; arrows define activation order.
- Player sets chain start (click a column-0 tile) and clicks **Attack**.
- Chain resolves step-by-step (attack, defend, fire, poison, Reroute, hazard, siphon, boost).
- Enemy acts with telegraphed intent (attack/shield + hazard traps / leech nodes).
- Win: all enemy HP ≤ 0. Lose: player HP ≤ 0.
- Multi-enemy fights: click an enemy to set your attack target before attacking; pick a new target mid-chain if the current one dies. When **all** enemies are dead, the chain stops (remaining cards do not activate).

## Run structure

The game is a **run**: a left-to-right map of nodes connected by lines
(`src/game/run/runMap.ts`). The player picks one node per column; enemies ramp
in difficulty toward a boss (`warden`) in the final column. Each run has **9 columns**
between the opening fight and the boss (`RUN_CONFIG.middleColumns`).

### Logical floors (scaffolding)

The current single map is split into **3 logical floors** (no separate maps yet):

| Floor | Columns | Notes |
|-------|---------|--------|
| 1 | `0–3` | Opens → semi-boss lieutenant |
| 2 | `4–7` | Mid run |
| 3 | `8–10` | Late → Warden |

Helpers: `getFloorForColumn`, `getFloorColumnRange`, `RUN_CONFIG.floorCount` in `runMap.ts`. The map UI shows the current floor.

### Hand rerolls (per floor)

- **`GAME_RULES.rerollsPerFloor` (3)** — shared across all fights on the current floor.
- Owned by run state in `App` (`floorRerollsRemaining`); passed into each battle via `START_BATTLE.rerollsRemaining`.
- Sessions/`DeckHand` do **not** reset to 3 each fight; spending syncs back through `REROLL_STATE`.
- Entering the first node of a higher floor refills to max.

### Node kinds & economy

- **Node kinds** (`src/game/run/nodeKinds.ts`, `RunMapNode.kind`): `enemy` and `boss`
  are battles; `shop` and `event` are non-battle stops. Each kind has an icon
  (`NodeKindIcon`, from game-icons.net) and a hover tooltip on the map. Map labels use
  generic kind names (`mapNodeDisplay.ts`) — **Street Op**, **Lieutenant**, **Signal**, **Ripperdoc**,
  **Warden** — except **Saboteur** (regular fights only) and **Warden**, which stay named. First column
  is always `enemy`; column 4 (row index 3) is always a **semi-boss** lieutenant fight
  (`smokebinder` / `saboteur`); last column is the `boss`; other middle columns are weighted-random
  (`rollNodeKind`: 70% enemy, 20% event, 10% shop). The column **before the Warden** is always **Safehouse**
  (`rest` nodes): rest for 30% max integrity or free-upgrade one card (`RestOverlay`, `restSite.ts`).
  **Signal nodes** resolve on visit (`signalEncounter.ts`):
  first jack-in is always an encounter; each prior signal raises ambush chance into a regular street fight.
  Encounters roll from `runEvents.ts` — wheel, matcher, combo trials, stasis patches, gambles, body mods,
  dead drops, malware spikes, wire rats, and more. Map always shows the generic **Signal** label until you arrive.
- **Ripperdoc shop** (`ShopOverlay`, `shop.ts`): seeded offers (`seedScope(seed, shop:<nodeId>)`) — buy a card, body mod, Integrity heal, or remove a card from the run deck. Spend creds; leave without buying is always available.
- **HP carries over** between fights, with a small heal on each victory (`RUN_CONFIG.healOnVictory`).
- **Deck persists and grows**: the run owns the deck as a list of card definition ids (`getDefaultDeckDefinitionIds`). Each battle builds instances from those ids (`buildDeckFromDefinitionIds`).
- **Victory rewards**: street ops grant a standard 3-pick-1 card reward (skip allowed); lieutenants grant elite card + lieutenant body mod; boss wins grant the **Gatekeeper Seal** body mod then end the run.
- Losing any battle, or clearing the boss, ends the run (`RunEndOverlay` → new run).
- The map regenerates each run.

### First-run teaching

- `localStorage` flag via `src/ui/tutorial/Tutorial.tsx`.
- Intro overlay before the first map pick; coach strip on the first battle; off-chain tip after dismissing the coach (round 1); reward/shop tip after the first win. Dismissible; skipped once seen.

Flow: `menu (settings)` → `map (pick node)` → `battle` → `win → reward → map` / `lose → defeat` / `boss win → victory`.
Non-battle nodes: `map (pick shop)` → `visit (ShopOverlay)` → `map`; `map (pick event)` → `visit (RunEventOverlay)` → `map`.
Victory/defeat can return to the main menu or start a fresh run immediately.

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
  - `shop:<nodeId>` — Ripperdoc stock
  - `battle:<nodeId>` — a battle's stream, reseeded in `Game.startBattle` (passed via
    the `START_BATTLE` payload `seed`)
- Because each boundary reseeds, map/reward results are **idempotent and order-independent**
  (robust to React StrictMode double-invocation); battles are reproducible given the same
  player actions (actions consume the battle stream in order).
- The player can set the seed on the **main menu** before starting, and still view/edit it on the map before the first battle (`RunMapOverlay`).

### Rewards (variable, extensible)

Rewards are data on each map node (`RunMapNode.reward`), modeled as a discriminated
union in `src/game/run/rewards.ts`:

```
RunReward =
  | CardReward { kind: 'card'; choiceCount; pickCount; rerollable; pool?: 'standard' | 'elite' }
  | BodyModRunReward { kind: 'body-mod' }
```

- **Variable per node** — `rewardForNodeKind`: normal enemies use `DEFAULT_CARD_REWARD` (standard pool); semi-boss uses `SEMI_BOSS_CARD_REWARD` (elite pool).
- **Body-mod-ready** — the numeric knobs are the intended extension seam:
  - `pickCount > 1` → "pick two cards"
  - `rerollable: true` → reroll the offered choices (`CardRewardOverlay` already renders the button + `App` handles reroll)
  - add new `RunReward` kinds without touching existing handling.
- Card choices come from `REWARD_CARD_POOL` / `ELITE_REWARD_CARD_POOL` via `rollCardReward(choiceCount, pool, { deck, floor })`.
  Offers are **weighted by deck archetypes** (`deckArchetypes.ts`) and **card tier vs floor** (later floors favor uncommon/rare).
  Starter deck is a **synergy-seeded Runner kit** (routing core + one seed each of fire/poison/bleed/fortify/overload). Deeper specialty cards still arrive through rewards/shop/events. Character-specific starters are planned later.
- Cards have **tiers** (1 common → 3 rare) and **upgrades** (`attack` → `attack-plus`). Ripperdoc **Chrome Grind** upgrades one deck card.

When adding body mods: give body mods a modifier step that adjusts the `RunReward`
before `rollCardReward`/display, or add a new `RunReward` kind + a case in `App`'s
`onBattleWon`.

---

## Architecture (active code only)

```
index.html → src/main.tsx → App.tsx (run shell)
  ├── runController/useRunController.ts (run state, phase machine, handlers)
  ├── runController/useBattleBridge.ts (Phaser EventBus: battles, puzzles, recap)
  ├── runController/rewardHelpers.ts (reward rolls, map seeding)
  ├── PhaserGame.tsx → src/game/main.ts → scenes/Game.ts
  ├── RunPhaseScreens.tsx (phase → overlay JSX)
  ├── MainMenuOverlay.tsx   (home / settings / how-to-play / credits / quit + card index + bestiary)
  ├── CardCollectionOverlay.tsx (unlocked / locked card archive)
  ├── BestiaryOverlay.tsx   (unlocked / locked enemy archive)
  ├── BodyModBestiaryOverlay.tsx (unlocked / locked body mod archive; uses ArchiveOverlay)
  ├── ArchiveOverlay.tsx      (shared archive shell + filter UX)
  ├── CyberPanel.tsx          (CyberPanelChrome, ModalShell, CyberOverlay)
  ├── desktopBridge.ts      (`window.signalChainDesktop` quit/fullscreen hooks for Electron)
  ├── GameHud.tsx           (battle phase)
  ├── Tutorial.tsx          (first-run intro / coach / tip)
  ├── RunMapOverlay.tsx     (map phase; node icons + tooltips + floor/rerolls)
  ├── CardRewardOverlay.tsx (reward phase)
  ├── ShopOverlay.tsx       (Ripperdoc visit)
  ├── NodeVisitOverlay.tsx  (generic non-shop visit fallback)
  └── RunEndOverlay.tsx     (victory / defeat → new run or main menu)
```

`App.tsx` owns run state (map, path, carry-over HP, floor rerolls, phase). Boot starts on
`menu`; Start begins a run on `map`. The Phaser `Game` scene does **not** auto-start a fight;
it waits for `START_BATTLE`, builds a battle, and emits `BATTLE_WON` / `BATTLE_LOST` back to React.

| Layer | Path | Role |
|-------|------|------|
| Run controller | `src/runController/useRunController.ts` | Map/battle/end phases, carry-over HP, node picks |
| Run UI shell | `src/App.tsx`, `src/ui/components/RunPhaseScreens.tsx` | Thin React shell + phase overlay mounting |
| Run map | `src/game/run/runMap.ts` | Graph generation, reachability, run config |
| Session | `src/game/cardGame/domain/CardGameSession.ts` | Turn flow / combat orchestration facade (delegates to DeckHand, FieldEffects, CombatResolver, EnemyPhaseController, BoardEditController) |
| Deck / hand | `src/game/cardGame/domain/DeckHand.ts` | Draw pile, hand, discard, rerolls |
| Board edits | `src/game/cardGame/domain/BoardEditController.ts` | Place / remove / move / swap while combat is idle |
| Field effects | `src/game/cardGame/domain/FieldEffects.ts` | Dampen field, silenced/bomb slots, hazard/boost placement |
| Combat | `src/game/cardGame/domain/CombatResolver.ts` | Attack damage, player damage, shields, poison |
| Enemy phase | `src/game/cardGame/domain/EnemyPhaseController.ts` | Enemy turn queue, phase prep, telegraph ramp |
| Combat | `src/game/cardGame/combat/AttackPipeline.ts` | Chain resolution, type streaks, off-chain bonus |
| Enemy AI | `src/game/cardGame/combat/enemyTurn.ts` | Intent, attack/shield, hazard placement |
| Passives | `src/game/cardGame/enemyPassives/` | Per-enemy counter-play |
| Config | `src/game/cardGame/config/` | `gameRules.json`, `cards.json`, `enemies.json` |
| Board UI | `src/game/board/` | Grid, hand, piles, health, armor views |
| React HUD | `src/ui/components/GameHud.tsx` | Attack, reroll controls |
| Map / end UI | `src/ui/components/RunMapOverlay.tsx`, `RunEndOverlay.tsx` | Node picking, run results |
| Event buses | `EventBus` (React↔Phaser shell, incl. `START_BATTLE`/`BATTLE_WON`/`BATTLE_LOST`), `CardGameEventBus` (in-game) |

**Shared config:** `src/game/config/gridConfig.ts` (5×5 board), `uiTypography.ts`.

---

## Core loop

```
Deploy → Attack (chain resolve, costs 1 energy) → Enemy responds → refill hand, board persists → repeat while energy remains → energy = 0 → last enemy response → board clears → energy refills → new hand → repeat
```

The player turn is **escalating**: each Attack resolves the current board without clearing it, so later attacks chain through more cards. **The enemy responds after every attack.** The hand refills to full after each enemy response while you still have energy. Once all energy is spent, the board clears and you draw a fresh hand for the next round. Each Attack spends one **energy** (`energyPerTurn`, default 3); energy refills after the final enemy response of the round. The Dead Zone (dampen) field ticks down when the board clears at round end.

**Risk/reward:** the first attack of an energy round is baseline, but every *extra* attack before energy refills ramps the enemy's incoming attack damage by `enemyDamageRampPerAttack` (default 4). Spending all your energy before the refill means facing a harder-hitting enemy on those later attacks.

| Rule | Value | Config |
|------|-------|--------|
| Player HP | 80 | `gameRules.json` |
| Deck / hand | 20 / 8 | `gameRules.json` |
| Energy (attacks) per turn | 3 | `gameRules.json` (`energyPerTurn`) |
| Enemy damage ramp per extra attack | +4 | `gameRules.json` (`enemyDamageRampPerAttack`) |
| Rerolls per floor | 3 | `gameRules.json` (`rerollsPerFloor`) |
| Chain start column | 0 | `gameRules.json` |
| Max chain steps | 24 | `gameRules.json` |
| Off-chain bonus | +2 damage (attack) / +2 armor (defend) on board but not in chain | `gameRules.json` |
| Type streak | +15% per duplicate attack/defend in streak | `gameRules.json` |
| Field boost | Random boost on empty tile; multiplies next chain step (boosts stack: ×2 each) | `gameRules.json` |
| Resolution speed | Chain step 800ms, enemy turn 800ms (snappy) | `gameRules.json` |

---

## Tactical systems (implemented)

| System | Files | Player decision |
|--------|-------|-----------------|
| Chain routing | `AttackPipeline.ts`, `cardDirections.ts` | Arrow pools, leap (2-tile), corner-turn (`cornerTurn` — hooks to a forward-diagonal, `getCornerNextSlot`), edge-wrap (`wrapEdges` — **Phase Relay** continues on the opposite board edge). Loop-reset exists in code but is **disabled** (not in starter deck, rewards, or puzzles). |
| Poison trail | `poisonTrailAbility.ts` | Converts subsequent defends to **poison stacks** on the enemy |
| Poison stacks (status) | `CardGameSession.tickPoison` | Enemy takes `stacks` damage at the start of each of its turns (ignores shield), then stacks decay by 1 |
| Fire alternation | `fireAlternationAbility.ts` | +3 damage per alternating attack/defend after fire |
| Bleed (Rupture / Shiv / Lacerate) | `bleedAbility.ts` | +2 damage per attack in the chain beyond 2 (rewards attack-heavy chains) |
| Fortify (Bulwark / Bramble) | `fortifyAbility.ts` | +2 armor per defend in the chain beyond 2 (rewards defend-heavy chains) |
| Overload (Surge) | `overloadAbility.ts` | When Surge activates: +3 damage per other skill already in the chain, ×2 if a Reroute already fired; shows `OVERLOAD N` on the card + enemy hit |
| Combo starters | `cards.json` — Shiv, Miasma, Cinder, Lacerate, Scorch, Bramble | Diagonal/corner/lunge variants that pair routing with bleed, poison trail, fire alternation, or fortify |
| Battle modifiers | `battleModifiers.ts`, `battle-mod` behavior, `battle-mod` enemy intent | ±10% to enemy attack, damage taken, shield gained, or damage dealt — player cards (Glitch/Hardwire/Patch/Overclock) and enemy intents. **All modifiers last until energy refills.** Field **Boost** multiplies the next battle-mod delta. Active chips sit **below** the player/enemy panels (`BattleModifierStatusView`): enemy-attack under enemies, other stats under the player. Each stat has a distinct color; % text is green (buff) or red (debuff). |
| Echo | `echo` behavior, `echoReplay.ts` | Re-activates the previous chain card (damage, armor, battle modifiers) then activates itself |
| Hazards/traps | `hazardBehavior.ts`, `AttackPipeline.applyBombConversion`, `FieldEffects.resolveHazardsAfterAttack` | Skip → slot explodes (4 dmg) + scorches tile; **route a card into it (or start the chain on it and continue)** → the trap converts to that card's type and joins the chain. **All resolved traps are removed from the board after the attack.** Enemies only place traps in the **last 3 columns**. |
| **Curse cards** | `cards.json` (`unplayable`, `nonRerollable`, `handEndPenalty`), `CardGameSession.resolveHandEndPenalties` | Bad cards that clog resources — **Burden** (place to clear hand; **cannot be rerolled**; route through it safely or take **double hand penalty** if left off-chain on attack; 5 dmg if held in hand at end of turn). **Fuse** (weak attack, 8 dmg if not placed by end of turn). Penalties resolve after **each attack**. **Saboteur** adds Burdens via `curseHand` |
| Shield layer | Both sides | Absorbs before HP (poison bypasses shield) |
| Enemy passives | `enemyPassives/` | See enemy roster below |
| Combat traits | `combat/combatTraits/` | Defensive abilities (Damage Cap, Hit Ward) with icons below the enemy name; also grantable via `combatTraits` on enemies or body mods |

### Enemy roster (`cardGame/config/enemies.json`)

| ID | Counter-play |
|----|--------------|
| `basic` | Raider — baseline (HP ~40, atk 13, 65% attack), no passives |
| `thornward` | **Thorns** — take 1 damage per Attack hit (blockable); **Damage Cap** trait — each card hit deals at most 5 damage |
| `saboteur` | Enrage (+3 atk per trap), Escalate (ramps traps +1/turn up to 4), Silence Tile, **Curse Hand** (adds Burden to hand each turn) — trap pressure snowballs. On the run map, saboteur nodes always connect to an adjacent route up or down on the next column. |
| `warden` | Wet Blanket (halves fire bonus), Jammer (+5 shield if chain ≥6), Last Stand (≤25% HP: atk 12, 2 traps); **Hit Ward** trait — first 3 card hits deal no damage |
| `smokebinder` | Smoke (blocks poison stacks), Loop Hunter (dormant while loop-reset is out of content), Dead Zone (telegraphed event: every 2 turns, cards on even checkerboard tiles deal half damage/armor next turn) |
| `field-medic` | Low personal threat — **ally support** in multi-enemy fights: heals weakest ally, can shield the most shielded ally (`allyActions` in `enemies.json`). Can appear as a duo partner in mid-run Street Ops. |
| `gridlock` | **Column Pressure** — after each turn, locks one board column (telegraphed); you cannot place/move onto that column. Never locks the chain-start column. |
| `broodframe` | **Spawn** — 80 HP host that opens with a **Wire Drone** (20 HP). Respawns a drone every 2 host turns, or under 50% HP if none live. Focus the drone or burn the frame. |
| `wire-drone` | Fast chip damage minion for Broodframe fights. |
| `android` (**Severance**) | **Shatter** — on death splits into Arm (thorns-lite), Core (shield-heavy), and Legs (traps). Fight continues until all parts fall. |
| `android-arm` / `android-core` / `android-legs` | Shatter fragments with distinct intents. |
| `cred-vulture` | **Cred Leech** — steals 3 run creds after each of its turns (synced back to App on battle end). |
| `toll-bot` | **Reroll Tax** — each hand reroll adds +4 attack and +1 trap on its next turn. |
| `wire-thief` | **Card Thief** — steals a random draw-pile card on turn 1; flees after 5 turns (card lost if it escapes; recovered if killed). |
| `null-scribe` | **Skill Jam** — first 3 skill cards in each chain have abilities negated. |
| `stutter-node` | **Stutter Clock** — every other enemy phase, its attack/shield step executes twice (telegraphed). |
| `phantom-relay` | **Phantom Intent** — telegraphs both attack and shield; only the real step fires. |
| `vector-haunt` | **Signal Twist** — telegraphed `redirect-hand` intent; scrambles arrows on cards in your hand for the rest of the energy round (Reroute untouched). Arrows restore when energy refills. |
| `drain-host` | **Leech Nodes** — places a siphon field card each turn. Route through it to shut it off; leave it off-chain and the Host heals for the node's power (8). Does not scorch the tile. |
| `twin-clip` | **Link Rage** — duo fight; killing one enrages the survivor (+6 atk, +1 trap next turn). |
| `bulwark-runner` + `glass-striker` | **Buffer pair** — Bulwark redirects the first hit each chain aimed at the 16 HP Glass Striker. |
| `chrome-saint` + `glass-striker` | **Healer pair** — 72 HP Chrome Saint heals the fragile striker each turn. |

Each enemy should force a **different deck shape and chain strategy**.

**In-fight identity:** each enemy uses a unique accent frame + Craftpix portrait
(`public/assets/enemies/`, `enemyIdentity.ts` → `EnemyTargetView`). Map nodes stay generic
(Street Op / Lieutenant) — identity is revealed only when the fight starts. Silhouette glyphs
remain as a fallback if a portrait fails to load.

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
- [x] **Node kinds** — enemy/boss/shop/event nodes with icons + hover tooltips (`nodeKinds.ts`, `NodeKindIcon`); events via `RunEventOverlay`; shop via `ShopOverlay`
- [x] **Shop node** — Ripperdoc spends creds on cards/body mods/heal/remove (`shop.ts`, `ShopOverlay`)
- [x] **Random event node** — branching choice encounters (`RunEventOverlay`, `runEvents.ts`)
- [x] **Per-floor rerolls** — 3 hand rerolls shared across fights on each logical floor (`rerollsPerFloor`, App-owned)
- [x] **3-floor scaffolding** — logical floors on the current 11-column map (`getFloorForColumn`); separate floor maps later

#### Phase 2 — Spatial tactics (~1 week)

- [x] **Column pressure** — Gridlock locks a telegraphed board column each turn (`pressureColumn` / `lock-column`)
- [x] **Threshold telegraphs** — HUD shows Last Stand / Enrage breakpoints (`EnemyTargetView`)
- [ ] **Perfect-fight rewards** — bonus reroll or card upgrade for clean wins
- [x] **Ascension modifiers** — 0–10 counter (+10% enemy integrity per level); next tier unlocks after clearing the Warden; shown on map HUD; unlock message on victory screen only (`ascension.ts`)
- [x] **Route risk tags** — hot/safe branches on the map (`routeKind`, `routeModifiers.ts`)

#### Phase 3 — Meta (~1–2 weeks)

- [x] Unlock system (cards) — `cardCollection.ts` + main-menu Card index (auto from `cards.json`); enemy unlocks later
- [x] Unlock system (enemies) — `enemyBestiary.ts` + main-menu Bestiary; unlocks on encounter
- [x] Unlock system (body mods) — `bodyModBestiary.ts` + main-menu Body mods index; unlocks when installed in a run
- [x] Steam-ready main menu shell (settings / how-to-play / credits / quit + `signalChainDesktop` bridge)
- [ ] Daily/weekly seeded challenge
- [ ] Ascension modifiers (+enemy HP, −rerolls, faster enemy turns)
- [ ] Electron packaging + Steamworks (see `docs/electron-steam.md`)

### Body mod design backlog (hard but high-impact)

Ideas that reward routing mastery but need careful implementation:

| Concept | Hook | Why it's hard |
|---------|------|----------------|
| **Backwash Node** | Cards whose chain exits off-board still fire once at 50% | Off-board steps are currently dead ends; needs a synthetic “ghost” activation without breaking routing UI |
| **Lattice Memory** | Echo copies the *previous step's exit arrow*, not just its effect | Echo replay today is effect-only; arrow inheritance touches `AttackPipeline` + joker/reroute edge cases |
| **Scorched Trace** | Fire detonations mark tiles; the next card crossing that tile gets +1 type streak | Requires per-tile run state through board wipes and enemy field edits |
| **Phase Debt** | Once per floor, skip the enemy turn — next fight enemies start +25% HP | Cross-fight debuff storage + telegraph so it feels fair, not punitive |
| **Starboard Drag** | Right-routing cards deal −15% damage but grant +1 cred on kill | Directional tradeoff paired with **Portside Gyro** — needs kill-credit wiring in `CombatResolver` |

Implemented proc / routing mods live in `bodyMods.ts` + `CombatResolver.ts` (`mark-five`, `mark-seven`, `portside-gyro`, **capacitor-bank**).

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
| Shop / event node behavior | `ShopOverlay.tsx`, `shop.ts`, `RunEventOverlay.tsx`, `runEvents.ts`, `runPuzzles.ts`, `PuzzleHud.tsx`, `PuzzleResultOverlay.tsx`; `App.tsx` `visit`/`puzzle` phases |
| Rewards / reward pool / body-mod hooks | `src/game/run/rewards.ts` (`rewardForNodeKind`, tier×floor weights, deck-weighted `rollCardReward`), `deckArchetypes.ts` |
| Card tiers / upgrades | `cards.json` (`tier`, `upgrade`); materialize `*-plus` in `cardRegistry.ts`; shop via `cardUpgrades.ts` |
| Body mods (stats + playstyle) | `src/game/run/bodyMods.ts` — Mark V/VII (interval double damage), **Portside Gyro** (left arrows +30% damage), **Capacitor Bank** (every 3rd in-chain Defend → next Attack +50%), Venom Latch / Razor Feed / etc.; combat hooks in `CombatResolver.ts` |
| Persistent run deck | `getDefaultDeckDefinitionIds` / `buildDeckFromDefinitionIds` in `buildPlayerDeck.ts` (neutral starter; specialties from rewards) |
| Map / run visuals | `src/ui/components/MainMenuOverlay.tsx`, `RunMapOverlay.tsx`, `RunEndOverlay.tsx`, `CardRewardOverlay.tsx`, `ShopOverlay.tsx`; `.main-menu*` / `.run-map*` / `.run-end*` / `.card-reward*` / `.shop-overlay*` in `public/style.css` |
| First-run teaching | `src/ui/tutorial/Tutorial.tsx` |
| Floor helpers / per-floor rerolls | `runMap.ts` floors; `App.tsx` `floorRerollsRemaining`; `START_BATTLE.rerollsRemaining` |
| Run flow (phases, carry-over HP, deck, rewards) | `src/App.tsx` |
| Change balance numbers | `src/game/cardGame/config/gameRules.json` |
| Add/edit cards | `src/game/cardGame/config/cards.json`, `cardRegistry.ts` |
| Add/edit enemies | `src/game/cardGame/config/enemies.json`, `enemyCatalog.ts`, `enemyPassives/`; in-fight look: `presentation/enemyIdentity.ts` + `public/assets/enemies/` |
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
| 2026-08-13 | **Capacitor Bank + Phase Relay.** **Capacitor Bank** body mod: every 3rd Defend in a chain stores charge; the next Attack in that chain deals +50% (Echo replays do not extra-count defends). New **Phase Relay** card (`wrapEdges`): when its arrow exits the board, the chain continues from the opposite edge (top↔bottom, left↔right). In reward/elite pools. |
| 2026-08-13 | **Chain start discoverability.** START column glows while editable; every left-column tile shows row letters (A–E) with pulse, selected tile shows **START** badge; column header reads START; HUD hint shows current row and how to move it. |
| 2026-08-13 | **Mark V + Portside Gyro body mods.** **Mark V** doubles damage every 5th run attack (Mark VII stays at 7th). **Portside Gyro** gives left-routing card hits +30% damage. Body mod panel shows proc counters for both interval mods. Design backlog added for harder routing mods. |
| 2026-08-13 | **Direction picks everywhere + shop reroute.** All new cards (rewards, shop, events) prompt for chain direction. Ripperdoc adds **Signal Reroute** (40 creds) to change one card’s arrow; **Deck Excision** removes a card. Shop/remove/reroute pick specific copies with visible arrows. |
| 2026-08-13 | **Chain pacing tune.** Chain steps slowed for readability (`activationStepMs` 620): gentler late-chain acceleration, slightly longer gaps between cards, 300ms minimum per step. Big-moment holds on kills/chunky hits unchanged. |
| 2026-08-13 | **Run controller split.** `App.tsx` slimmed to shell + `RunPhaseScreens`; run state/handlers in `useRunController.ts`, Phaser bridge in `useBattleBridge.ts`, reward helpers in `rewardHelpers.ts`. |
| 2026-08-13 | **UI shell refactor.** `ModalShell` in `CyberPanel.tsx` dedupes backdrop + panel chrome across reward, shop, rest, run-end, and visit overlays. `ArchiveOverlay` + `useArchiveFilter` share filter/selection UX for card index, bestiary, and body mod archives. |
| 2026-08-13 | **Body mod index.** Main-menu **Body mods** archive (`bodyModBestiary.ts`, `BodyModBestiaryOverlay`) logs body mods when installed in a run (localStorage). Mirrors enemy bestiary UX. |
| 2026-08-13 | **Latch Array, Drain Host, faster chains.** Lieutenant body mod **Latch Array** pins the first Attack, Defend, and Skill placed each energy round through the board wipe (pick them up to re-pin). New field card **Leech Node** (`siphon`): in-chain like a trap (converted/disarmed); unchained heals a living enemy for 8 — no revive, no scorched tile. Street enemy **Drain Host** places one node per turn. Chain playback no longer waits a full extra step between cards; later steps accelerate, with holds + hitstop on kills, chunky hits, and on-step detonations (`activationStepMs` 480). |
| 2026-08-11 | **Signal Twist intent + Vector Haunt.** New enemy turn step `redirect-hand` (passive `handRedirect`) scrambles hand-card arrows for the rest of the energy round; restores on energy refill. Mid-run street enemy **Vector Haunt** telegraphs the twist each turn. |
| 2026-08-11 | **Rewards, ascension, routing, and run polish.** Street ops: pick a card or take nothing. Lieutenants: elite card then lieutenant relic. Warden: **Gatekeeper Seal** relic (+15 max integrity, +1 energy). Ascension 0–10 auto counter (+10% enemy integrity per level) — no pre-run picker; unlock banner after Warden only. Map **hot/safe** route tags (+15% / −10% enemy HP; hot pays +12 creds). Lieutenant **phase shift** at 50% HP (Smokebinder/Saboteur). Floor briefings, combat recap strip, reward synergy hints, run-end stats screen. |
| 2026-08-11 | **Encounter pool sync.** Street + signal ambush share `battleEncounterPools.ts` / `battleEncounterRoll.ts`. **Bulwark Runner** and **Chrome Saint** duos added to late columns (6–8); signal ambushes use the same pools and duo expansion as the map. |
| 2026-08-10 | **UI polish pass.** Shared cyber panel chrome (`CyberPanel.tsx`) applied across shop, safehouse, card rewards, run end, node visit. Card rewards use `CardChip`; phase-based canvas dimming; hand dock tray; cyberpunk theme extended to shop/rest/tutorial/banners/body mods/audio toggle. |
| 2026-08-10 | **Deck / graveyard UI polish.** Pile inspector overlay restyled (corner brackets, scanlines, cyan deck / magenta graveyard accents, card slots with hover glow). Battlefield pile widgets use neon panels + grid well. |
| 2026-08-10 | **Battlefield backdrop.** Procedural cyberpunk arena background during fights (perspective grid, neon glow behind board, circuit traces, scan sweep, HUD corner brackets). `BattlefieldBackgroundView` in `src/game/board/`. |
| 2026-08-10 | **Audio polish.** Card/UI SFX retuned to crisp digital ticks (less noise/sub mud). BGM files tail-trimmed via `npm run trim-bgm` so loops skip the outro fade; playback uses simple `loop: true`. |
| 2026-08-10 | **Background music.** Cyberpunk dubstep loops: *Glass Streets at Midnight* (run/map), *Concrete Veins* + *Iron Gait* (combat/lieutenant/puzzles, alternating), *Last Gatekeeper* (Warden intro + boss fight). Crossfade between tracks; mute toggle covers BGM + SFX. Files in `public/assets/music/`. |
| 2026-08-10 | **Sound effects.** Procedural placeholder WAVs (`scripts/generate-sfx.mjs`); Phaser audio wired for combat hits, card placement, chain steps, kills, shield/heal, map travel, rewards, shop, floor/boss intros, victory/defeat. Mute lives in Settings (in-run via MENU). Preference stored in localStorage. Replace assets per `public/assets/sfx/README.md` (Kenney CC0 recommended). |
| 2026-08-10 | **Juice & tension pass (no audio yet).** Combat: camera shake, hitstop, tiered damage numbers, element hit bursts, variable chain timing, high-threat intent pulse. Run: map travel animation, staggered card rewards, floor banner, visit entry fades, victory heal toast, boss/lieutenant intro, low-HP vignette, clutch win callout. |
| 2026-08-10 | **Pre-boss safehouse.** The column before the Warden is always Safehouse nodes: rest (30% max HP) or free card upgrade — pick one. |
| 2026-08-10 | **Signal ambushes + new encounters.** First signal is always an event; repeat signals escalate ambush chance into street fights. Five new encounters: Dead Drop, Signal Echo, Malware Spike, Data Shrine, Wire Rats. Outcomes resolve on visit (map stays generic Signal). |
| 2026-08-10 | **Card tiers, upgrades, stronger specialties.** Cards have tier 1–3; rewards bias higher tiers on later floors. Most cards upgrade to `*-plus` at Ripperdoc (Chrome Grind). New mid/rare cards: Neurotoxin, Black Ichor, Serration, Exsanguinate, Kindling, White-Hot, Citadel, Execution, Amp Core. |
| 2026-08-10 | **Build weave + playstyle chrome.** Starter deck is a neutral core. Card rewards/shop/events weight toward the deck’s emerging lane (`deckArchetypes` → blade/toxin/heat/bulwark). New body mods: Venom Latch (×2 poison), Razor Feed (+2 damage), Carapace Weave (+50% armor), Pyre Link (fire ×1.5), Hemorrhage Coil (bleed ×1.5). |
| 2026-08-10 | **Craftpix UI icons.** Replaced game-icons.net SVGs with Craftpix cyberpunk PNGs (`public/assets/ui-icons/`) for card behaviors, passives, intents, traits, map nodes, and events. Avatar packs remain for enemy portraits. |
| 2026-08-10 | **Enemy portrait presentation.** Portraits fill the target frame; HP/shield chrome sits under the art (no text over the face). Larger panel; accent on frame only. |
| 2026-08-10 | **Enemy portraits.** Craftpix cyberpunk avatars renamed under `public/assets/enemies/` and shown in-fight (`preloadEnemyPortraits` → `EnemyTargetView`). Accent frames kept; silhouettes remain as fallback. Map still hides encounter names. |
| 2026-08-10 | **Gridlock + Field Medic duos.** New enemy **Gridlock** locks a telegraphed board column each turn (`pressureColumn`). Mid-run Street Ops can pair a rolled enemy with **Field Medic**. Column pressure roadmap item done. |
| 2026-08-10 | **In-fight enemy identity stand-in.** Each enemy gets a unique accent color + silhouette (`enemyIdentity.ts`); map still hides encounter names. Ready to swap for character art later. |
| 2026-08-10 | **Per-floor rerolls + run economy + teaching.** Map split into 3 logical floors; hand rerolls (3) shared per floor via App/`START_BATTLE`. Ripperdoc shop (card/body mod/heal/remove). Lieutenant rewards use elite card pool. First-run tutorial overlays + coach strip. Last Stand / Enrage threshold text on enemy panels. |
| 2026-08-04 | **Burden off-chain tax.** Placed Burdens not included in the attack chain deal double hand-end penalty (10) to the player when the attack resolves. Chaining through Burden dumps it safely. |
| 2026-08-04 | **Burden rework.** Burden is no longer unplayable/reroll-dumpable. Place it as an inert board clog (clears it from hand, wastes a tile), or take the hand-end penalty. New `nonRerollable` card flag blocks hand reroll selection. |
| 2026-08-04 | **Boost stacking.** Consecutive field boosts multiply on the next consuming card (Boost→Boost→Attack = ×4). Jokers still pass the stack through. Ability payoffs (fire/poison/etc.) use the same stacked multiplier. |
| 2026-08-10 | **Map digital-nav backdrop.** Run map uses `MapBackgroundView` with a dot-matrix grid, static POI blips, HUD corner brackets, and a slow vertical scan — no horizontal lane lines that clash with route edges. Map field has a glass viewport panel; route edges use cyan/green neon styling. Distinct from the combat arena grid. |
| 2026-08-10 | **Player status layout.** Active battle-modifier chips anchor below the full RUNNER / body-mod trait stack (icon centers no longer overlap the name or trait row). |
| 2026-08-10 | **Steam-ready main menu.** Home / Settings / How to play / Credits / Quit. Settings holds seed, Master/Music/SFX, text size, fullscreen, and replay tutorial tips. Desktop bridge `window.signalChainDesktop` documented in `docs/electron-steam.md` for future Electron packaging. |
| 2026-08-10 | **Split audio buses.** Main menu exposes Master / Music / SFX sliders plus mute (`audioSettings.ts`). Effective gains are `master × bus`; BGM still multiplies per-track `BGM_LEVEL`. Legacy single volume migrates into master. |
| 2026-08-11 | **Broodframe + Severance enemies.** Broodframe (80 HP) opens with a Wire Drone (20 HP) and respawns drones on cadence / low HP (`spawnMinion`). Severance chassis shatters into Arm/Core/Legs on death (`shatterOnDeath`). Mid-battle `addCombatant` + squad UI sync via `COMBATANTS_CHANGED`. |
| 2026-08-10 | **Thorns retune.** Thornward (and default thorns) reflect **1** damage per Attack card hit (was 4 / default 2). |
| 2026-08-10 | **Boost scales battle mods.** Field Boost now multiplies Hardwire/Glitch/Patch/Overclock deltas (e.g. Boost → Hardwire = +20% shield gained). Previously Boost was consumed with no effect because battle-mod cards have no damage/armor. |
| 2026-08-10 | **Reroute rename.** Player-facing **Joker** card renamed to **Reroute** (internal id `joker` unchanged). Fits Signal Chain routing lore — mid-chain direction pick. |
| 2026-08-10 | **Credits = temp art only.** Credits screen lists Craftpix UI icons + enemy portraits (with pack ids / license link); dropped Phaser/React, music titles, and desktop packaging notes. |
| 2026-08-10 | **Card index from `cards.json`.** Collection catalog lists every base card automatically; set `"collectible": false` to hide system cards (traps, boosts, curses, dormant). No longer gated on reward-pool membership — friendlier for mods. |
| 2026-08-10 | **Chain stops on clear.** When the last living enemy dies mid-chain, remaining cards do not activate (end-of-chain effects still resolve for the partial chain). |
| 2026-08-10 | **Salvage heal-on-kill.** Salvage restores **7** HP on kill (upgraded **10**). |
| 2026-08-10 | **Card collection index.** Main menu **Card index** shows every collectible base card from `cards.json` as unlocked or locked (`???`). Opt out with `"collectible": false`. Starter deck cards unlock on boot; rewards, shop buys, and event deck gains unlock permanently via `localStorage` (`cardCollection.ts`). |
| 2026-08-10 | **Card index interaction fix.** Collection overlay mounts outside `.main-menu` (which uses `pointer-events: none`) so scroll, card select, and hover tooltips work; tooltips render below cards to avoid grid clipping. Menu + card index use `emitRunSfx` for open/select/filter/close and primary nav clicks. |
| 2026-08-10 | **UI text size setting.** Settings → Display offers Small / Medium / Large; persists via `localStorage` and sets CSS `--text-scale` (`textScale.ts`). Medium matches the previous default (1.15). |
| 2026-08-10 | **Card index tooltip readability.** Hover tooltips and the detail strip use larger scaled type, brighter body text, and a wider tooltip panel. |
| 2026-08-10 | **In-run pause menu.** Top-right control is **MENU** (was AUDIO). Opens pause overlay with Resume, Settings, Card index, and **New run** (confirmation required). Escape / CLOSE resumes. Audio lives under Settings. |
| 2026-08-10 | **Seed on New run only.** Map / run HUD seed is display-only. Seed input + randomize live on Start run / New run confirm; confirming still calls `resetRun(normalizeSeed(...))` as before. |
| 2026-08-10 | **Board grid legend.** How to play shows a mini 5×5 legend (cols 0–4, rows A–E vertical). Combat board draws matching axis labels; the live chain step highlights its letter + number in yellow. |
| 2026-08-10 | **Audio unlock fix.** React menu clicks now resume the Web Audio context (`ensureAudioUnlocked`); SFX queue until unlock and BGM restarts after the first gesture so overlays above the canvas are not silent. |
| 2026-08-10 | **Direction arrow icons.** Card chain arrows use shared `dir-arrow.svg` / `dir-loop.svg` (rotated per direction) on Phaser cards, pile chips, joker picker, and chain-start markers — Unicode glyphs remain as fallback / tooltip text. |
| 2026-08-10 | **Alpha notice.** Boot main menu shows an Alpha badge + copy that systems, balance, content, and UI are bound to change (`gameMeta.ts`). |
| 2026-08-10 | **Board chrome spacing.** Player portrait nudged left; row letter legend sits outside chain-start arrows and stays above them in draw order. |
| 2026-08-10 | **Chain start click target.** Column-0 tiles are clickable to set the attack start (no card from hand required). Empty cells use a full-tile hit; cards there tap-to-select / drag-to-move. All five START labels stay visible. |
| 2026-08-10 | **Iron Gait battle BGM.** Added `iron-gait.mp3` as a second standard combat loop; non-boss fights alternate with *Concrete Veins* by path length so map↔battle crossfades feel less jarring. |
| 2026-08-10 | **Chain-start arrow scale fix.** `setChainStartActive` no longer calls `setScale(1)` on SVG arrow images (that reset `setDisplaySize` back to the ~512px texture). |
| 2026-08-10 | **Enemy bestiary.** Main menu / pause **Bestiary** logs hostiles on encounter (`enemyBestiary.ts`, localStorage). Locked entries show `???`; unlocked show portrait, role, stats, and passive/trait dossier. Training Dummy excluded. |
| 2026-08-10 | **Synergy-seeded starter.** Default Runner deck keeps routing core but seeds Fire, Poison, Rupture, Bulwark, and Surge (plus Echo/Reroute/Overclock/Hardwire/Glitch) so early fights preview combo play. Character kits later. |
| 2026-08-10 | **Surge Overload on activation.** Overload damage plays during the Surge step (not end-of-chain): enemy hit + yellow `OVERLOAD N` float. Counts skills already in the chain — place Surge after setup. |
| 2026-08-10 | **Poison debuff chip.** Poison stacks apply during the trail beat and show a persistent **Poison N** status chip under the enemy (not only a float). |
| 2026-08-10 | **Main menu.** Boot opens on `menu` (`MainMenuOverlay`): set seed, mute/volume, then Start run. Digital map backdrop plays behind the menu. Victory/defeat offer Main menu or New run / Try again. |
| 2026-08-10 | **Switchback card.** New attack card deals 2× resolved damage (`stepDamageMultiplier`) but cycles lock target to the next living enemy after it hits (`switchTargetAfterHit`). In reward/elite pools. |
| 2026-08-10 | **First-round off-chain tip.** After dismissing the combat coach on the first battle, a popup explains that loose attack/defense cards on the board still grant off-chain bonuses (+2 damage / +2 armor from `gameRules.json`). |
| 2026-08-10 | **Combat UI fixes + run modifiers.** Tutorial coach dismiss no longer click-throughs to the deck (`UI_OVERLAY_ACTIVE` blocks pile clicks; coach raised above canvas). Enemy trait/passive/shield rows stack below the name; active battle-modifier chips anchor to the bottom of each panel (`BattleModifierStatusView` layout anchors). Shared `BATTLE_MODIFIER_PRESETS` + `runModifiers.ts` registry for future ascension tiers. |
| 2026-08-04 | **Mid-chain retarget prompts.** When the locked target dies and other enemies remain, the chain pauses and living hosts show **LOCK TARGET** until you click one (auto-continues if only one is left; leftover chain damage is skipped if none remain). |
| 2026-08-04 | **Attack lock / second-attack fix.** Killing the last enemy mid-chain no longer stalls waiting for a target (held the attack lock forever). Removed duplicate `turnResolving` scene flag — session `isBusy()` / attack lock is the single gate. HUD readiness updates as soon as an attack starts. |
| 2026-08-04 | **Enemy HP retune.** Combat enemies sit around ~40 HP (`enemies.json`: Raider 40, Thornward 38, Saboteur 36, Smokebinder 42, Field Medic 34, Warden 48). Training Dummy unchanged. |
| 2026-08-04 | **Loop Reset disabled.** Removed from starter deck (replaced with Poison), reward pool, and Combo Trial pool (`loop-lesson`). Combat/UI code remains dormant for a later fix. |
| 2026-07-15 | **Phase 2 god-object split.** Extracted `CombatResolver` (attack/damage/shield/poison) and `EnemyPhaseController` (enemy turn queue and phase lifecycle) from `CardGameSession`. Chain walk playback moved to `presentation/playback/chainPlayback.ts`. Session and presenter remain thin facades; public API unchanged. |
| 2026-07-15 | **Phase 1 god-object split.** Extracted `DeckHand` (deck/hand/discard/rerolls) and `FieldEffects` (dampen field, silenced/bomb-disabled slots, hazard/boost placement) from `CardGameSession`. Split `CardGamePresenter` playback into `presentation/playback/` (`combatHitVisuals`, `chainEndEffects`, `enemyTurnPlayback`). Session public API unchanged. |
| 2026-07-15 | **Chain ability visuals.** Skill abilities (fire alternation, poison trail, bleed, fortify, overload) now resolve visually in chain order at the end of an attack — each ability card re-highlights and shows its payoff before the next. Echo cards flash briefly, then replay the copied step as the main beat instead of overlapping both cards. |
| 2026-07-15 | **Trap/boost arrow reconciliation.** Field boosts and enemy traps now pick arrows that prefer chaining through adjacent ambient cards, and automatically break two-step ping-pong loops (trap ↓ boost + boost ↑ trap) by reassigning the boost's exit arrow (`fieldCardArrows.ts`). |
| 2026-07-15 | **Combat trait icons.** Shared trait system (`combatTraits/`) with dedicated icon row below enemy names (`CombatTraitRowView`) and below **RUNNER** for body-mod traits. Traits configured on enemies via `combatTraits` in `enemies.json` or on body mods via `combatTraits` in `bodyMods.ts`. **Damage Cap** and **Hit Ward** moved out of enemy passives; example body mod **Reactive Plating** grants Hit Ward (2 hits). |
| 2026-07-15 | **Enemy damage mitigation traits.** **Damage Cap** — each card hit deals at most 5 damage; **Hit Ward** — first 3 card hits deal no damage. Combat logic in `combatTraits/mitigation.ts`; blocked hits show floating **BLOCKED** text. Added to **Thornward** (cap) and **Warden** (ward). |
| 2026-07-14 | **Trap column restriction.** Enemy traps only spawn in the last three board columns (`gridConfig.isTrapPlacementColumn`, `placeEnemyHazard`). |
| 2026-07-14 | **Enemy intent layout.** Boxless telegraph: large tinted icon with Orbitron value below (dark stroke, no chip frame). Multi-step turns wrap onto extra rows within each panel so every step stays visible (no overlap with neighboring enemies). |
| 2026-07-14 | **Enemy intent during player turn.** `setDefeated(false)` no longer clears intent chips; `emitAttackReadiness` re-telegraphs upcoming enemy turns while the player deploys (hidden during enemy phase resolution). |
| 2026-07-14 | **Per-step chain activation.** Battle modifiers and defend armor apply when each card activates during the attack animation (not batched at `completeAttack`). Enemy intents refresh live as modifiers land; Echo replays apply on the Echo step. |
| 2026-07-14 | **Enemy row layout.** Multiple hostiles align left-to-right from the board edge (layout reserves width for 3 slots). Turn intent chips sit above each enemy panel, clear of the frame and shield badge. |
| 2026-07-14 | **Echo + Patch stacking.** Battle modifiers now resolve from the full chain in `completeAttack` (`chainBattleModifiers.ts`), so Patch → Echo correctly stacks to -20% damage taken. Presenter still shows per-step modifier VFX only. |
| 2026-07-14 | **Multi-enemy targeting UX.** Fights with multiple hostiles now lay out enemies left-to-right. When no target is locked, HUD shows a persistent prompt, the Attack button reads **Select Target**, and living enemies pulse with a **LOCK TARGET** badge until clicked. |
| 2026-07-14 | **Multi-enemy phase loop fix.** After the last enemy in a prepared phase acted, `playEnemyResponse` no longer called `beginEnemyTurn` again (which re-queued every living enemy and caused endless attacks). `hasMoreEnemyTurnsInPhase` gates the loop; `beginEnemyTurn` returns null when the prepared queue is drained. |
| 2026-07-14 | **Unified pile card visuals.** Deck/graveyard stacks and the pile inspector now use the same card chrome as the hand (`buildCardGraphic` / `buildCardBackGraphic`, React `CardChip`). Graveyard shows the top discard face-up; deck shows face-down backs. |
| 2026-07-14 | **Combat UI polish.** Modernized fight layout: larger player (**RUNNER**) and enemy frames with neon brackets, glow rings, and diamond avatars; board neon panel backdrop; layered hand/board cards with corner accents; fanned hand with hover lift; cyberpunk deck/graveyard piles and shield badge; HUD energy pips and Attack/Reroll buttons aligned to neon theme (`cyberpunkUiGraphics.ts`, `uiDisplayTextStyle`). |
| 2026-07-14 | **5×5 combat board.** Card grid expanded from 4×4 to 5×5 (`gridConfig.ts`, `tileSize` 80). Sign Matcher minigame stays 4×4. |
| 2026-07-14 | **Map label polish.** Regular fights show as **Street Op** on the map. All semi-boss nodes always show **Lieutenant** (including saboteur lieutenants). |
| 2026-07-14 | **Hidden map encounter names.** Map nodes show generic kind labels (Street Op, Lieutenant, Signal, Ripperdoc, Warden) instead of specific enemy/event titles. **Saboteur** (non-lieutenant) and **Warden** remain visible as named threats. |
| 2026-07-14 | **Saboteur map branching.** Nodes fighting the saboteur always link to adjacent routes on the next column (up and/or down), so clearing them opens a vertical path change. |
| 2026-07-14 | **Map node mix + semi-boss.** Middle columns roll 70% enemy / 20% event / 10% shop. Column 4 is always a **semi-boss** (`Lieutenant`: `smokebinder` or `saboteur`) with horned-skull map styling. |
| 2026-07-14 | **Longer run map.** Nine columns now sit between the first fight and the boss (11 columns total). Enemy pools ramp across the longer path; branching uses a wider bell curve (`ROW_SIZES`). |
| 2026-07-14 | **First column is always enemy.** Column 0 now always rolls `enemy` nodes (basic pool) so every run opens with a fight. Removed the column-0 Sign Matcher guarantee; events still roll in later columns. |
| 2026-07-14 | **Cyberpunk naming pass.** Trinkets renamed to **body mods** (`bodyMods.ts`): Chrome Heart, Overclock Cell, Cred Siphon. Run currency shown as **creds**; map labels use Integrity / Body Mods. Events retitled (Fate Spinner, Glyph Matcher, Stasis Patch, Black ICE Relic, Neural Drill, Chrome Dealer). Node kinds: Hostile, Warden, Ripperdoc, Signal. |
| 2026-07-14 | **Enemy responds after each attack.** The enemy now acts immediately after every player attack (graveyard → board clear → enemy turn), not only when energy is depleted. Energy persists across these exchanges and refills only after the last attack in a round (energy = 0). Hand renews after each enemy turn. Damage ramp still stacks for extra attacks within the same energy round. |
| 2026-07-14 | **Per-step player armor.** Defend armor now applies when each chain card finishes (`grantPlayerShield` during presentation), not in one batch at attack end. Thorns reflect during a later chain step can be blocked by shield from an earlier defend. `completeAttack` only adds armor not already granted mid-chain. |
| 2026-07-14 | **Cyberpunk theme + animation polish.** Neon cyan/magenta palette across React overlays (`cyberpunk-theme.css`: Orbitron/Rajdhani fonts, scanline grid, panel glow) and Phaser canvas (`cyberpunkTheme.ts`). Shared combat tweens (`visualEffectTweens.ts`) — snappier card glow pulses, hit flashes, floating damage numbers. Board slots, card colors, health bars, chain-start indicator, and graveyard discard animation updated to match. |
| 2026-07-14 | **Thorns trigger on hit.** Thorns now reflects damage whenever you deal attack damage to the enemy — shield is no longer required. Fires per damage step in the chain (e.g. attack then defend still procs thorns on the attack). |
| 2026-07-14 | **Event map labels.** Event nodes now roll their encounter at **map generation** (`RunMapNode.eventId`) and show the title on the map (e.g. **Sign Matcher**). Column 0 always places Sign Matcher on the first event node; siblings in the same column get distinct events. Picking a node uses the pre-rolled id (no surprise reroll). Sign Matcher weight raised to match other headliners. |
| 2026-07-14 | **Wheel of Fate visuals.** Wheel now shows segment icons on a skewed face — curse/damage slices are drawn larger (~42% of the wheel) so bad luck *looks* more likely, but `rollWheelSegment` odds stay equal. Spin animation lands using visual mid-angles (`wheelDisplay.ts`). |
| 2026-07-14 | **Combo trial rewards + rules + difficulty.** Passing a combo trial now opens a **3-card reward picker** (take one or none) instead of auto-adding a random card. Trial rules shown on brief, in-fight HUD, and reward overlay (`PUZZLE_TRIAL_RULES`, `BATTLE_REWARD_RULES`). Damage targets raised across all puzzles; failure damage increased. Battle victory overlay also shows rules and allows skipping the card reward via **Take nothing**. |
| 2026-07-14 | **Sign Matcher memory game.** Sign Matcher is now a 4×4 (16-tile) picture-matching minigame: eight icon pairs, flip two per attempt, **4 attempts** to match as many pairs as possible. Rewards scale with pairs matched (gold tiers; 3+ pairs adds a card with gold/HP costs; 0 pairs deals damage). Seeded grid via `buildIconMatchGrid`. |
| 2026-07-14 | **Code tidy-up.** Body-mod battle stats route through `runResources`; `Game.syncBoardFromSession()` dedupes board sync; battle-mod presenter logic shared; dead telegraph alias removed; event types aligned; first-column test grunts reverted to 2× basic. |
| 2026-07-14 | **Body mod panel.** Persistent run UI lists installed body mods with effect text. Mark VII shows a run-wide attack counter (`4/7`) that updates live during fights and highlights when the next attack is charged. |
| 2026-07-14 | **Exhaust is battle-scoped.** `exhaustOnPlay` cards are destroyed for the current fight only (skip graveyard, no reshuffle). They stay in your run deck and return in the next battle. |
| 2026-07-14 | **Multi-enemy fights.** Battles can spawn multiple enemies (`enemyIds` on map nodes; first column is 2× basic). Click an enemy to select your attack target. Mid-chain retargeting when the current target dies. Each living enemy acts after every player attack. |
| 2026-07-14 | **Salvage card.** 4-damage attack, exhaust on play. If its damage kills an enemy, heal 5 HP. |
| 2026-07-14 | **Modifier rounding.** Incoming damage mods (Patch/Glitch/enemy intents) combine then round **down** once in the defender's favor (13 at −10% → 11, not 12). Player buff mods (Hardwire/Overclock) round **up**. Stacked reductions no longer double-floor. |
| 2026-07-14 | **Glitch duration.** Glitch now lasts the full energy round (`energy-round` modifier duration) — enemy attack stays -10% across multiple attacks until energy refills. Other battle-mod cards still expire after each enemy turn. |
| 2026-07-14 | **Echo card.** New `echo` behavior replays the previous chain step when activated — repeats its resolved damage, armor, and battle modifiers, then Echo activates normally. Starter deck includes one Echo (replaces a second Joker). |
| 2026-07-14 | **Battle modifiers (±10%).** New `battle-mod` system (`battleModifiers.ts`): four stats — enemy attack, damage taken, shield gained, damage dealt — stack in ±10% steps. Player cards: **Glitch** (-enemy atk, lasts until energy refills), **Hardwire** (+shield), **Patch** (-damage taken), **Overclock** (+damage dealt). Enemy intents can telegraph the same modifiers before attack/traps. Most modifiers expire after each enemy turn; Glitch persists for the energy round. |
| 2026-07-14 | **Per-step shield feedback.** Defend armor now grants when each card finishes (not when the next starts): `+N` floats on the card and shield HUD, so thorns on the following attack visibly hits shield first. Thorns splits shield absorb vs HP damage in the presenter. |
| 2026-07-14 | **Enemy intent + card variety.** Enemy intent chips no longer pulse — they fade in once with a static framed chip. Six new combo cards: **Shiv** (diagonal bleed), **Miasma** (diagonal poison), **Cinder** (diagonal fire), **Lacerate** (lunge bleed), **Scorch** (corner fire), **Bramble** (corner fortify) — each with distinct colors. Starter deck now mixes basics with Shiv/Cinder/Miasma/Lacerate/Rupture/Bulwark; reward pool expanded with specials, leaps, and all combo cards. |
| 2026-07-14 | **Deck pile view.** Draw pile inspector shows each card face-up, grouped by type and sorted alphabetically; draw order stays hidden. |
| 2026-07-14 | **Trap-first chain fix.** Starting an attack on an enemy trap now converts that trap from the next chain card's type (same bomb-conversion rule as routing into a trap), so the chain deals damage/armor and continues instead of stalling. `Game.onAttackResolved` always releases the attack lock even when turn UI is unavailable; attack animation timers are tracked for cleanup. |
| 2026-07-14 | **Courier + exhaust cards + smaller hand.** **Courier** discards up to 2 cards from the left of hand into the graveyard when played (includes unplayable curse cards). New `discardFromHandOnPlay` and `exhaustOnPlay` on `CardDefinition` — exhaust cards are destroyed for that fight only (not graveyard, not reshuffled). Starting hand **8** (`gameRules.handSize`). |
| 2026-07-14 | **Corner Defense readability.** Single arrow tucked in the card corner (no dual hook preview); tooltip copy simplified. Corner Strike keeps the hook preview. |
| 2026-07-14 | **Player round gating.** Board persists until all energy is spent; the enemy responds after **each** attack. `endPlayerRound` / board clear runs only when `energy === 0` (after that attack's enemy response). |
| 2026-07-21 | **Draw pile alphabetical again.** Deck inspector still shows face-up chips with arrows, but sorts A–Z so draw order stays hidden. Graveyard stays newest-first. |
| 2026-07-21 | **Draw pile matches discard inspector.** Deck and graveyard pile views share the same logic: face-up chips with chain arrows, grouped by definition+arrow, top of pile listed first. Only the pile source/title differs. |
| 2026-07-21 | **Dedup / modularize.** Card activation glows collapse to `glowVisualFactory` + `glowVisuals` (12 near-clones → config). Tooltip controllers are attach-only wrappers over `GameTooltipController`. Board place/move/swap/remove extracted to `BoardEditController`. Shared `formatCardPowerLabel` for Phaser + React chips. |
| 2026-07-21 | **Graveyard shows card arrows.** Discard pile inspector includes each card's chain direction (`CardChip` arrow glyphs). Same-definition cards with different arrows stay separate groups; newest discard listed first. Phaser pile face-up preview scales arrow size with card width. |
| 2026-07-21 | **Traps clear after each attack.** Disarmed (chain-included) and detonated (unchained) enemy traps are removed from the board in `FieldEffects.resolveHazardsAfterAttack` when the attack completes — so they no longer linger across multi-energy attacks. Unchained traps still scorch their tile for the rest of the energy round. |
| 2026-07-21 | **Attack lock through enemy response.** The attack lock is no longer released between chain resolve and the enemy phase — that gap let a second Attack start and leave the lock stuck (`attack-in-progress` on the next energy). Lock clears only when the player may act again (`unlockPlayerInput`). Enemy phase playback extracted to `enemyPhasePlayback.ts`; chain timers now replace (not stack). |
| 2026-07-21 | **Distinct applied battle-modifier chips.** Active modifiers sit below the player/enemy panels (enemy-attack under enemies; armor/damage-taken/damage-dealt under the player). Each stat uses its own color; % labels are green for player buffs and red for debuffs. Enemy intent battle-mod icons use the same per-stat colors. |
| 2026-07-15 | **Per-card chain animations.** Attack steps no longer skip the glow pulse when damage resolves instantly — each chain card keeps its activation visual for a full `activationStepMs` before the chain advances. |
| 2026-07-15 | **Unified combat tooltips.** Cards, enemy intents, passives, traits, and active battle-modifier icons share one DOM tooltip panel (`GameTooltipController`, `.card-tooltip` styling). Battle-mod status chips no longer use a separate Phaser canvas tooltip. |
| 2026-07-15 | **Turn-end curse exhaustion.** Hand-end penalties (`handEndPenalty`) now resolve after **each attack** (start of every enemy phase), not only when energy hits zero. Penalized cards are battle-exhausted (removed from hand, skip graveyard) so Burdens and unplaced Fuses cannot stack across a multi-attack round. |
| 2026-07-15 | **Battle modifier status icons.** Active buffs/debuffs render above the player panel with tinted icons, % labels, and hover tooltips (`BattleModifierStatusView`, `battleModifierDisplay.ts`). All battle modifiers now last until energy refills (`energy-round` only). |
| 2026-07-15 | **Enemy ally support.** Configurable `allyActions` on enemies (`enemyAllySupport.ts`): `heal-ally` / `shield-ally` with `amount`, `chance`, and `target` rules for multi-enemy fights. New **Field Medic** enemy demonstrates the system. |
| 2026-07-14 | **Event trade-offs.** Every positive event outcome now pairs with a cost (`lose-gold` caps at current gold; HP damage or curse cards for other rewards). Healing Spring: +18 HP / −18 gold. Wheel: spin costs 5 gold; gold/heal/card/trinket segments also cost HP, gold, or Burden. Sign Matcher win costs 12 gold. Gambler coin and Cursed Idol smash cost HP. Combo Trial success pays mirror gold costs and curse tax on bonus cards. |
| 2026-07-14 | **Combo Trial events.** New **Combo Trial** random event launches a seeded damage puzzle (`runPuzzles.ts`, `START_PUZZLE` / `PUZZLE_RESOLVED`). Player receives a fixed hand of combo cards against a **Training Dummy** (`training-dummy` enemy, no counterattack) and must deal at least the target damage in **one attack**. Puzzles teach Boost, attack streaks, Strike loops, Fire alternation, and Rupture bleed (Loop Reset trial removed while the card is disabled). Success grants gold/cards; failure costs a little HP. Puzzle UI: brief screen in `RunEventOverlay`, in-fight goal/hint in `PuzzleHud`, result in `PuzzleResultOverlay`. |
| 2026-07-14 | **Random run events.** Map `event` nodes now open `RunEventOverlay` with seeded encounters (`runEvents.ts`, `seedScope(seed, event:<nodeId>)`). Five events: **Wheel of Fate** (spin for gold/card/curse/trinket/heal/trap), **Sign Matcher** (pick the duplicated icon — card or damage), **Healing Spring**, **Cursed Idol** (trinket + Burden or gold), **Gambler's Offer** (HP for card or gold). First map column is now **all events** for easy testing. Run resources: **gold** + **trinkets** (`trinkets.ts`, `runResources.ts`) shown on the map; trinkets pass into battles (`START_BATTLE.trinkets`) — Vitality Charm (+10 max HP), Energy Cell (+1 energy/turn), Lucky Pouch (+8 gold on victory). Shop nodes remain a placeholder (`NodeVisitOverlay` shows gold). |
| 2026-07-14 | **Curse / bad cards.** New card flags `unplayable` and `handEndPenalty` on `CardDefinition`. **Burden** — cannot be played, deals 5 damage if still in hand when the turn ends. **Fuse** — weak attack (power 2) that must be placed before end of turn or deals 8 damage. Penalties resolve in `CardGameSession.resolveHandEndPenalties` at end of player turn (`Game.resolveEnemyPhase`). Unplayable cards blocked in `placeCardFromHand` and `CardHandView` drag. New `curse` behavior (inert on board). **Saboteur** gains `curseHand` passive — slips 1 Burden into your hand after each enemy turn (can exceed hand size). |
| 2026-07-07 | **Escalation risk/reward: enemy damage ramps with attacks per round.** Each extra attack the player makes in a round increases the enemy's next attack damage by `gameRules.enemyDamageRampPerAttack` (default 4; first attack is baseline). Ramp derives from spent energy (`CardGameSession.getAttacksThisRound` = `maxEnergy − energy`, `getEnemyDamageRamp`), is baked into attack steps at resolve time (`beginEnemyTurn` → `rampEnemyAction`), and is telegraphed live: after each attack `Game.onAttackResolved` re-shows the scaled intent (`getScaledEnemyIntent`). Attack intent tooltip notes the ramp. |
| 2026-07-07 | **Enemy balance pass for the escalating turn** (`enemies.json`). Since a turn now lands up to `energyPerTurn` re-firing attacks, enemy `maxHealth` scaled ~2.3× (Raider 80→190, Thornward 72→170, Saboteur 64→150, Warden 95→220, Smokebinder 78→185) with moderate `attackDamage`/`shieldGain`/`attackChance` bumps so escalating shields don't trivialize them. Thornward's reflect 3→4 and Warden's high shield/Jammer act as natural counters to multi-attack re-firing. Tunable per taste. |
| 2026-07-07 | **Escalating turn / dynamic play.** A player turn is no longer one-and-done: Attack now resolves the board **without clearing it**, so cards stay and each subsequent Attack chains through a longer, escalating sequence. Each Attack costs **1 energy** (`gameRules.energyPerTurn`, default 3, on `GameRules`); the hand refills to full after every attack (`CardGameSession.refillHand`) so the deck progresses mid-turn. New **End Turn** button (`GAME_EVENTS.END_TURN`) — or running out of energy — discards the board and hands off to the enemy (`Game.onEndTurn` → `resolveEnemyPhase`, formerly the post-attack path). Energy state (`getEnergy`/`getMaxEnergy`/`hasEnergy`/`spendEnergy`, reset each turn in `completeEnemyTurn`) surfaces via `GAME_EVENTS.TURN_STATE` → HUD energy pips + End Turn button (`GameHud`, `TurnState`). New readiness reason `no-energy`. Board edits are locked during end-turn resolution via a `turnResolving` guard in `Game`. Dead Zone/dampen now ages once per turn (`CardGameSession.tickDampenField`, called in `resolveEnemyPhase`) instead of per attack. |
| 2026-07-07 | **Pile inspection:** the Deck and Graveyard piles are now clickable (`CardPileView.setClickHandler`, hover highlight). Clicking emits `pile-view-open` (`GAME_EVENTS.PILE_VIEW_OPEN`) with grouped card entries built in `Game.openPileView` from `CardGameSession.getDeckDefinitionIds`/`getDiscardDefinitionIds`. A React modal (`PileViewOverlay`, mounted in `App`) shows the cards grouped by type with counts and power, colored by behavior (`CARD_VISUALS`). The deck is sorted alphabetically by label; draw order is still hidden. Closes on backdrop click / × / Escape. |
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
