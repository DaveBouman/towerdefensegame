import type Phaser from 'phaser';
import {
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
type AudioUnlockListener = () => void;

let scene: Phaser.Scene | null = null;
let loaded = false;
let settings: AudioSettings = readAudioSettings();
const listeners = new Set<AudioSettingsListener>();
const unlockListeners = new Set<AudioUnlockListener>();
let unlockHooked = false;
let unlockInFlight: Promise<void> | null = null;
const pendingSfx: Array<{ key: SfxKey; options: PlaySfxOptions }> = [];

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

const getAudioContext = (): AudioContext | null =>
{
    if (!scene?.sound)
    {
        return null;
    }

    const manager = scene.sound as Phaser.Sound.WebAudioSoundManager;

    return manager.context ?? null;
};

const flushPendingSfx = (): void =>
{
    if (pendingSfx.length === 0)
    {
        return;
    }

    const queued = pendingSfx.splice(0, pendingSfx.length);

    for (const entry of queued)
    {
        playSfxNow(entry.key, entry.options);
    }
};

const notifyUnlocked = (): void =>
{
    for (const listener of [ ...unlockListeners ])
    {
        listener();
    }

    flushPendingSfx();
};

const hookUnlockEvents = (): void =>
{
    if (!scene?.sound || unlockHooked)
    {
        return;
    }

    unlockHooked = true;
    scene.sound.on('unlocked', () =>
    {
        notifyUnlocked();
    });
};

/**
 * Resumes the Web Audio context after a user gesture.
 * React overlays sit above the Phaser canvas, so Phaser's default unlock
 * alone often never hears the first click — call this from UI actions.
 */
export const ensureAudioUnlocked = (): Promise<void> =>
{
    if (!scene?.sound)
    {
        return Promise.resolve();
    }

    hookUnlockEvents();

    const manager = scene.sound as Phaser.Sound.WebAudioSoundManager;

    if (typeof manager.unlock === 'function' && manager.locked)
    {
        manager.unlock();
    }

    const context = getAudioContext();

    if (!context || (context.state !== 'suspended' && context.state !== 'interrupted'))
    {
        return Promise.resolve();
    }

    if (!unlockInFlight)
    {
        unlockInFlight = context.resume()
            .then(() =>
            {
                unlockInFlight = null;
                notifyUnlocked();
            })
            .catch(() =>
            {
                unlockInFlight = null;
            });
    }

    return unlockInFlight;
};

export const onAudioUnlocked = (listener: AudioUnlockListener): (() => void) =>
{
    unlockListeners.add(listener);

    return () => unlockListeners.delete(listener);
};

export const bindGameAudioScene = (targetScene: Phaser.Scene): void =>
{
    scene = targetScene;
    unlockHooked = false;
    hookUnlockEvents();
};

export const unbindGameAudioScene = (): void =>
{
    scene = null;
    unlockHooked = false;
    unlockInFlight = null;
    pendingSfx.length = 0;
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
    void ensureAudioUnlocked();
    notifyListeners();
};

export const setMasterVolume = (nextVolume: number): void =>
{
    settings = {
        ...settings,
        masterVolume: Math.max(0, Math.min(1, nextVolume)),
    };
    writeMasterVolume(settings.masterVolume);
    void ensureAudioUnlocked();
    notifyListeners();
};

export const setSfxVolume = (nextVolume: number): void =>
{
    settings = {
        ...settings,
        sfxVolume: Math.max(0, Math.min(1, nextVolume)),
    };
    writeSfxVolume(settings.sfxVolume);
    void ensureAudioUnlocked();
    notifyListeners();
};

export const setMusicVolume = (nextVolume: number): void =>
{
    settings = {
        ...settings,
        musicVolume: Math.max(0, Math.min(1, nextVolume)),
    };
    writeMusicVolume(settings.musicVolume);
    void ensureAudioUnlocked();
    notifyListeners();
};

export const subscribeSfxSettings = (listener: AudioSettingsListener): (() => void) =>
{
    listeners.add(listener);
    listener(getAudioSettings());

    return () => listeners.delete(listener);
};

const notifyListeners = (): void =>
{
    const snapshot = getAudioSettings();

    for (const listener of listeners)
    {
        listener(snapshot);
    }
};

const playSfxNow = (key: SfxKey, options: PlaySfxOptions = {}): void =>
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

    const context = getAudioContext();
    const needsUnlock = Boolean(
        context && (context.state === 'suspended' || context.state === 'interrupted'),
    );

    if (needsUnlock)
    {
        pendingSfx.push({ key, options });
        void ensureAudioUnlocked();
        return;
    }

    void ensureAudioUnlocked();
    playSfxNow(key, options);
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
