import { getDesktopApi, isDesktopShell } from './desktopBridge';
import {
    GAME_MIN_HEIGHT,
    GAME_MIN_WIDTH,
} from '../ui/gameViewport';

export type DisplayPresetId =
    | 'adaptive'
    | '960x540'
    | '1280x720'
    | '1600x900'
    | '1920x1080'
    | '2560x1440';

export interface DisplayPreset {
    id: DisplayPresetId;
    width: number | null;
    height: number | null;
}

const STORAGE_KEY = 'signal-chain-display-preset';

export const DISPLAY_PRESETS: readonly DisplayPreset[] = [
    { id: 'adaptive', width: null, height: null },
    { id: '960x540', width: GAME_MIN_WIDTH, height: GAME_MIN_HEIGHT },
    { id: '1280x720', width: 1280, height: 720 },
    { id: '1600x900', width: 1600, height: 900 },
    { id: '1920x1080', width: 1920, height: 1080 },
    { id: '2560x1440', width: 2560, height: 1440 },
];

export const DEFAULT_DISPLAY_PRESET: DisplayPresetId = '1280x720';

const PRESET_IDS = new Set<DisplayPresetId>(
    DISPLAY_PRESETS.map((preset) => preset.id),
);

export const isDisplayPresetId = (value: string): value is DisplayPresetId =>
    PRESET_IDS.has(value as DisplayPresetId);

export const getDisplayPreset = (id: DisplayPresetId): DisplayPreset | undefined =>
    DISPLAY_PRESETS.find((preset) => preset.id === id);

export const readDisplayPreset = (): DisplayPresetId =>
{
    if (!isDesktopShell())
    {
        return DEFAULT_DISPLAY_PRESET;
    }

    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw && isDisplayPresetId(raw))
        {
            return raw;
        }
    }
    catch
    {
        /* ignore */
    }

    return DEFAULT_DISPLAY_PRESET;
};

export const writeDisplayPreset = (presetId: DisplayPresetId): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, presetId);
    }
    catch
    {
        /* ignore */
    }
};

export const applyDisplayPreset = async (presetId: DisplayPresetId): Promise<void> =>
{
    if (!isDisplayPresetId(presetId))
    {
        return;
    }

    writeDisplayPreset(presetId);

    const desktop = getDesktopApi();

    if (desktop?.setDisplayPreset)
    {
        await desktop.setDisplayPreset(presetId);
    }
};

export const applyStoredDisplayPreset = async (): Promise<DisplayPresetId> =>
{
    const presetId = readDisplayPreset();

    await applyDisplayPreset(presetId);

    return presetId;
};

export const readActiveDisplayPreset = async (): Promise<DisplayPresetId> =>
{
    const desktop = getDesktopApi();

    if (desktop?.getDisplayPreset)
    {
        const active = await desktop.getDisplayPreset();

        if (typeof active === 'string' && isDisplayPresetId(active))
        {
            return active;
        }
    }

    return readDisplayPreset();
};
