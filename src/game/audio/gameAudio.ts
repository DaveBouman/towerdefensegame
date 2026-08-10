import type Phaser from 'phaser';
import {
    getEffectiveMusicGain,
    getEffectiveSfxGain,
    readAudioSettings,
    writeAudioMuted,
    writeMasterVolume,
    writeMusicVolume,
    writeSfxVolume,
    type AudioSettings,
} from './audioSettings';
import {
    ALL_SFX_KEYS,
    SFX_FILES,
    type SfxKey,
} from './sfxManifest';

export interface PlaySfxOptions {
    volume?: number;
    rate?: number;
}

export type AudioSettingsListener = (settings: AudioSettings) => void;

let scene: Phaser.Scene | null = null;
let loaded = false;
let settings: AudioSettings = readAudioSettings();
const listeners = new Set<AudioSettingsListener>();

export const preloadSfx = (targetScene: Phaser.Scene): void =>
{
    for (const key of ALL_SFX_KEYS)
    {
        if (targetScene.cache.audio.exists(key))
        {
            continue;
        }

        targetScene.load.audio(key, SFX_FILES[key]);
    }
};

export const markSfxLoaded = (): void =>
{
    loaded = true;
};

export const bindGameAudioScene = (targetScene: Phaser.Scene): void =>
{
    scene = targetScene;
};

export const unbindGameAudioScene = (): void =>
{
    scene = null;
};

export const getAudioSettings = (): AudioSettings => ({ ...settings });

/** Global mute — silences SFX and music. */
export const isSfxMuted = (): boolean => settings.muted;

export const getMasterVolume = (): number => settings.masterVolume;

/** SFX bus volume (0–1), before master. */
export const getSfxVolume = (): number => settings.sfxVolume;

/** Music bus volume (0–1), before master. */
export const getMusicVolume = (): number => settings.musicVolume;

export const setSfxMuted = (nextMuted: boolean): void =>
{
    settings = { ...settings, muted: nextMuted };
    writeAudioMuted(nextMuted);
    notifyListeners();
};

export const setMasterVolume = (nextVolume: number): void =>
{
    settings = {
        ...settings,
        masterVolume: Math.max(0, Math.min(1, nextVolume)),
    };
    writeMasterVolume(settings.masterVolume);
    notifyListeners();
};

export const setSfxVolume = (nextVolume: number): void =>
{
    settings = {
        ...settings,
        sfxVolume: Math.max(0, Math.min(1, nextVolume)),
    };
    writeSfxVolume(settings.sfxVolume);
    notifyListeners();
};

export const setMusicVolume = (nextVolume: number): void =>
{
    settings = {
        ...settings,
        musicVolume: Math.max(0, Math.min(1, nextVolume)),
    };
    writeMusicVolume(settings.musicVolume);
    notifyListeners();
};

export const toggleSfxMuted = (): boolean =>
{
    setSfxMuted(!settings.muted);

    return settings.muted;
};

export const subscribeSfxSettings = (listener: AudioSettingsListener): (() => void) =>
{
    listeners.add(listener);
    listener(getAudioSettings());

    return () => listeners.delete(listener);
};

/** @deprecated Prefer subscribeSfxSettings — kept as alias for clarity. */
export const subscribeAudioSettings = subscribeSfxSettings;

const notifyListeners = (): void =>
{
    const snapshot = getAudioSettings();

    for (const listener of listeners)
    {
        listener(snapshot);
    }
};

export const playSfx = (key: SfxKey, options: PlaySfxOptions = {}): void =>
{
    if (!scene || !loaded || !scene.sound)
    {
        return;
    }

    if (!scene.cache.audio.exists(key))
    {
        return;
    }

    const volume = (options.volume ?? 1) * getEffectiveSfxGain(settings);

    if (volume <= 0)
    {
        return;
    }

    try
    {
        scene.sound.play(key, {
            volume,
            rate: options.rate ?? 1,
        });
    }
    catch
    {
        /* scene tearing down */
    }
};

export const playDamageSfx = (damage: number): void =>
{
    if (damage >= 20)
    {
        playSfx('hit-heavy', { volume: 1 });
    }
    else if (damage >= 8)
    {
        playSfx('hit-light', { volume: 1 });
    }
    else if (damage > 0)
    {
        playSfx('hit-light', { volume: 0.82, rate: 1.08 });
    }
};

export const playEnemyDamageSfx = (damage: number): void =>
{
    if (damage <= 0)
    {
        return;
    }

    playSfx('enemy-hit', { volume: Math.min(1, 0.68 + damage / 35) });
};
