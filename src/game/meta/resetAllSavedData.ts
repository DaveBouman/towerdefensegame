import { readAudioSettings } from '../audio/audioSettings';
import {
    setMasterVolume,
    setMusicVolume,
    setSfxMuted,
    setSfxVolume,
} from '../audio/gameAudio';
import { DEFAULT_DISPLAY_PRESET } from '../desktop/displaySettings';
import { writeSteamFacesEnabled } from '../desktop/steamAvatars';
import { setInputPromptDeviceOverride } from '../input/inputPrompts';
import { ensureStarterCollectionUnlocks } from '../run/cardCollection';
import {
    applyCursorColor,
    DEFAULT_CURSOR_COLOR,
} from '../ui/cursorSettings';
import {
    applyTextScale,
    DEFAULT_TEXT_SCALE,
} from '../ui/textScale';

/** Every localStorage key owned by Signal Chain — keep in sync when adding persistence. */
export const ALL_SAVED_DATA_KEYS = [
    'card-chain-has-seen-tutorial',
    'signal-chain-card-collection',
    'signal-chain-enemy-bestiary',
    'signal-chain-body-mod-bestiary',
    'signal-chain-relic-bestiary',
    'signal-chain-ascension',
    'td-game-text-scale',
    'td-game-sfx-muted',
    'td-game-master-volume',
    'td-game-sfx-volume',
    'td-game-music-volume',
    'signal-chain-steam-faces',
    'signal-chain.inputPromptDevice',
    'signal-chain-cursor-color',
    'signal-chain-display-preset',
    'signal-chain-path-lit',
] as const;

export const clearAllSavedDataKeys = (): void =>
{
    if (typeof localStorage === 'undefined')
    {
        return;
    }

    for (const key of ALL_SAVED_DATA_KEYS)
    {
        try
        {
            localStorage.removeItem(key);
        }
        catch
        {
            // Ignore private-mode / blocked storage.
        }
    }
};

/** Wipes all saved progress and settings, then reapplies factory defaults in memory. */
export const resetAllSavedData = (): void =>
{
    clearAllSavedDataKeys();

    applyTextScale(DEFAULT_TEXT_SCALE);
    applyCursorColor(DEFAULT_CURSOR_COLOR);
    setInputPromptDeviceOverride(null);

    const defaults = readAudioSettings();
    setSfxMuted(defaults.muted);
    setMasterVolume(defaults.masterVolume);
    setSfxVolume(defaults.sfxVolume);
    setMusicVolume(defaults.musicVolume);

    writeSteamFacesEnabled(true);

    try
    {
        localStorage.setItem('signal-chain-display-preset', DEFAULT_DISPLAY_PRESET);
    }
    catch
    {
        // Ignore quota errors.
    }

    ensureStarterCollectionUnlocks();
};
