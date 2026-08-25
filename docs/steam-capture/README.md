# Steam screenshot capture kit

Use **`?capture=<id>`** to jump straight to a framed in-game moment (no run grind). Capture at **1920×1080**; hide the browser chrome.

```
http://localhost:8080/?capture=shop
```

**Between shots:** hard-refresh the tab, or open a new tab per URL. Same `capture` id on reload is ignored (Strict Mode safe).

## Minimum 6 (Steam upload)

Steam wants **at least ~5–6 strong screenshots**. These six match [STEAM_PAGE_COPY.md](../STEAM_PAGE_COPY.md) and cover the pitch end-to-end:

| # | Capture ID | Upload as |
|---|------------|-----------|
| 1 | `board` | Core combat — mid-row leap + corner hook, hand + intents |
| 2 | `combo` | Combo payoff — fire alternation |
| 3 | `map` | Branching run map |
| 4 | `shop` | Ripperdoc shop open |
| 5 | `reward` | Pick a card (elite 3-choice) |
| 6 | `boss` | Warden / boss pressure |

Quick URLs (dev server):

```
/?capture=board   … or ?capture=1
/?capture=combo   … or ?capture=2
/?capture=map     … or ?capture=3
/?capture=shop    … or ?capture=4
/?capture=reward  … or ?capture=5
/?capture=boss    … or ?capture=6
```

## Extended set (10)

| # | Capture ID | What to frame |
|---|------------|---------------|
| 7 | `multi` | Two enemies + attack target |
| 8 | `bodymod` | Lieutenant body-mod reward |
| 9 | `event` | Signal wheel event |
| 10 | `rest` | Safehouse rest / upgrade |

Capsule / library art: `npm run generate-steam-art` → `docs/steam-art/`.

## Seed

All scenarios use run seed **`STEAM-CAPTURE`** (deterministic shop/reward/map rolls).

## Tips

- Static chain: don’t press Attack; capture with board + intents only.
- For juice: run `board` or `combo`, press Attack once, screenshot mid-resolution.
- Optional HUD clutter: hide menu button in a later pass if needed.
