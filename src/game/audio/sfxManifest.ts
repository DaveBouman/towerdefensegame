/** Keys for files in `public/assets/sfx/<key>.wav`. */
export type SfxKey =
    | 'ui-click'
    | 'ui-select'
    | 'card-place'
    | 'chain-step'
    | 'hit-light'
    | 'hit-heavy'
    | 'kill'
    | 'shield'
    | 'defend-proc'
    | 'ability-cast'
    | 'heal'
    | 'enemy-hit'
    | 'enemy-move'
    | 'map-travel'
    | 'reward'
    | 'shop-buy'
    | 'floor-enter'
    | 'victory'
    | 'defeat'
    | 'boss-intro';

export const ALL_SFX_KEYS: readonly SfxKey[] = [
    'ui-click',
    'ui-select',
    'card-place',
    'chain-step',
    'hit-light',
    'hit-heavy',
    'kill',
    'shield',
    'defend-proc',
    'ability-cast',
    'heal',
    'enemy-hit',
    'enemy-move',
    'map-travel',
    'reward',
    'shop-buy',
    'floor-enter',
    'victory',
    'defeat',
    'boss-intro',
];

export const SFX_FILES: Record<SfxKey, string> = Object.fromEntries(
    ALL_SFX_KEYS.map((key) => [ key, `assets/sfx/${key}.wav` ]),
) as Record<SfxKey, string>;
