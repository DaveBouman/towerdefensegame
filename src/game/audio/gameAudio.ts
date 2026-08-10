import type Phaser from 'phaser';
import {
    ALL_SFX_KEYS,
    readSfxMuted,
    readSfxVolume,
    SFX_FILES,
    type SfxKey,
    writeSfxMuted,
    writeSfxVolume,
} from './sfxManifest';

export interface PlaySfxOptions {
    volume?: number;
    rate?: number;
}

type SfxListener = (muted: boolean, volume: number) => void;

let scene: Phaser.Scene | null = null;
let loaded = false;
let muted = readSfxMuted();
let masterVolume = readSfxVolume();
const listeners = new Set<SfxListener>();

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

export const isSfxMuted = (): boolean => muted;

export const getSfxVolume = (): number => masterVolume;

export const setSfxMuted = (nextMuted: boolean): void =>
{
    muted = nextMuted;
    writeSfxMuted(nextMuted);
    notifyListeners();
};

export const setSfxVolume = (nextVolume: number): void =>
{
    masterVolume = Math.max(0, Math.min(1, nextVolume));
    writeSfxVolume(masterVolume);
    notifyListeners();
};

export const toggleSfxMuted = (): boolean =>
{
    setSfxMuted(!muted);

    return muted;
};

export const subscribeSfxSettings = (listener: SfxListener): (() => void) =>
{
    listeners.add(listener);
    listener(muted, masterVolume);

    return () => listeners.delete(listener);
};

const notifyListeners = (): void =>
{
    for (const listener of listeners)
    {
        listener(muted, masterVolume);
    }
};

export const playSfx = (key: SfxKey, options: PlaySfxOptions = {}): void =>
{
    if (muted || !scene || !loaded || !scene.sound)
    {
        return;
    }

    if (!scene.cache.audio.exists(key))
    {
        return;
    }

    const volume = (options.volume ?? 1) * masterVolume;

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
        playSfx('hit-heavy', { volume: 0.95 });
    }
    else if (damage >= 8)
    {
        playSfx('hit-light', { volume: 0.85 });
    }
    else if (damage > 0)
    {
        playSfx('hit-light', { volume: 0.55, rate: 1.08 });
    }
};

export const playEnemyDamageSfx = (damage: number): void =>
{
    if (damage <= 0)
    {
        return;
    }

    playSfx('enemy-hit', { volume: Math.min(1, 0.45 + damage / 40) });
};
