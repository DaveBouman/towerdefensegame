# Sound effects

Placeholder WAV files are generated procedurally (no license required):

```bash
node scripts/generate-sfx.mjs
```

## Replacing with higher-quality SFX

Keep the same filenames so `src/game/audio/sfxManifest.ts` stays valid.

### Recommended free sources

| Source | License | Notes |
|--------|---------|-------|
| [Kenney.nl](https://kenney.nl/assets) | **CC0** (public domain) | Best default pick. Try **Interface Sounds**, **Impact Sounds**, **UI Audio**. No attribution required; commercial use OK. |
| [OpenGameArt.org](https://opengameart.org/) | Varies (often CC-BY) | Check each asset; credit if required. |
| [Sonniss GDC bundles](https://sonniss.com/gameaudiogdc) | Royalty-free | Large annual packs; good for polished sets. |
| [Pixabay](https://pixabay.com/sound-effects/) / [Freesound](https://freesound.org/) | Varies | Verify license and attribution before shipping. |

### Suggested Kenney mapping

| File | Use |
|------|-----|
| `ui-click.wav` | Failed actions, light taps |
| `ui-select.wav` | Map node pick, enemy turn cue |
| `card-place.wav` | Card placed on board |
| `chain-step.wav` | Chain step / attack start |
| `hit-light.wav` / `hit-heavy.wav` | Player damage to enemies |
| `enemy-hit.wav` | Damage to player |
| `kill.wav` | Enemy defeated |
| `shield.wav` | Armor gained |
| `heal.wav` | HP restored |
| `map-travel.wav` | Travel to battle node |
| `reward.wav` | Card reward screen |
| `shop-buy.wav` | Shop purchase |
| `floor-enter.wav` | New floor banner |
| `victory.wav` / `defeat.wav` | Battle outcome |
| `boss-intro.wav` | Lieutenant / Warden intro |

Drop replacements into this folder and refresh the game.
