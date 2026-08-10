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

const STORAGE_KEY = 'td-game-sfx-muted';
const VOLUME_KEY = 'td-game-sfx-volume';

export const readSfxMuted = (): boolean =>
{
    try
    {
        return localStorage.getItem(STORAGE_KEY) === '1';
    }
    catch
    {
        return false;
    }
};

export const writeSfxMuted = (muted: boolean): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    }
    catch
    {
        /* ignore */
    }
};

export const readSfxVolume = (): number =>
{
    try
    {
        const raw = localStorage.getItem(VOLUME_KEY);
        const parsed = raw ? Number(raw) : 0.85;

        return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.85;
    }
    catch
    {
        return 0.85;
    }
};

export const writeSfxVolume = (volume: number): void =>
{
    try
    {
        localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, volume))));
    }
    catch
    {
        /* ignore */
    }
};
