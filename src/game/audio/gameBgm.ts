import type Phaser from 'phaser';
import {
    ALL_BGM_TRACKS,
    BGM_FILES,
    BGM_LEVEL,
    type BgmTrack,
} from './bgmManifest';
import { getSfxVolume, isSfxMuted, subscribeSfxSettings } from './gameAudio';

const CROSSFADE_MS = 1400;

let scene: Phaser.Scene | null = null;
let loaded = false;
let activeTrack: BgmTrack | null = null;
let activeSound: Phaser.Sound.WebAudioSound | null = null;
let pendingTrack: BgmTrack | null = null;
let unsubscribeSettings: (() => void) | null = null;

const getTargetVolume = (track: BgmTrack): number =>
{
    if (isSfxMuted())
    {
        return 0;
    }

    return getSfxVolume() * BGM_LEVEL[track];
};

export const preloadBgm = (targetScene: Phaser.Scene): void =>
{
    for (const track of ALL_BGM_TRACKS)
    {
        if (targetScene.cache.audio.exists(track))
        {
            continue;
        }

        targetScene.load.audio(track, BGM_FILES[track]);
    }
};

export const markBgmLoaded = (): void =>
{
    loaded = true;

    if (pendingTrack)
    {
        const track = pendingTrack;
        pendingTrack = null;
        crossfadeTo(track);
    }
};

export const bindGameBgmScene = (targetScene: Phaser.Scene): void =>
{
    scene = targetScene;

    unsubscribeSettings?.();
    unsubscribeSettings = subscribeSfxSettings(() =>
    {
        syncActiveVolume();
    });
};

export const unbindGameBgmScene = (): void =>
{
    unsubscribeSettings?.();
    unsubscribeSettings = null;
    stopBgm(true);
    scene = null;
    loaded = false;
    pendingTrack = null;
};

const getSound = (track: BgmTrack): Phaser.Sound.WebAudioSound | null =>
{
    if (!scene)
    {
        return null;
    }

    const existing = scene.sound.get(track);

    if (existing)
    {
        return existing as Phaser.Sound.WebAudioSound;
    }

    if (!scene.cache.audio.exists(track))
    {
        return null;
    }

    return scene.sound.add(track, { loop: true, volume: 0 }) as Phaser.Sound.WebAudioSound;
};

const syncActiveVolume = (): void =>
{
    if (!activeTrack || !activeSound)
    {
        return;
    }

    const volume = getTargetVolume(activeTrack);
    activeSound.setVolume(volume);

    if (volume <= 0)
    {
        activeSound.pause();
        return;
    }

    if (!activeSound.isPlaying)
    {
        try
        {
            activeSound.play();
        }
        catch
        {
            /* autoplay blocked until user gesture */
        }
    }
};

export const crossfadeTo = (track: BgmTrack): void =>
{
    if (!scene || !loaded)
    {
        pendingTrack = track;
        return;
    }

    if (activeTrack === track && activeSound?.isPlaying && getTargetVolume(track) > 0)
    {
        return;
    }

    const nextSound = getSound(track);

    if (!nextSound)
    {
        return;
    }

    const targetVolume = getTargetVolume(track);
    const previous = activeSound;

    activeTrack = track;
    activeSound = nextSound;

    if (!nextSound.isPlaying)
    {
        try
        {
            nextSound.play({ volume: 0 });
        }
        catch
        {
            return;
        }
    }

    scene.tweens.killTweensOf(nextSound);
    scene.tweens.add({
        targets: nextSound,
        volume: targetVolume,
        duration: CROSSFADE_MS,
        ease: 'Sine.easeInOut',
    });

    if (previous && previous !== nextSound)
    {
        scene.tweens.killTweensOf(previous);
        scene.tweens.add({
            targets: previous,
            volume: 0,
            duration: CROSSFADE_MS,
            ease: 'Sine.easeInOut',
            onComplete: () =>
            {
                previous.stop();
            },
        });
    }
};

export const stopBgm = (immediate = false): void =>
{
    if (!activeSound || !scene)
    {
        activeTrack = null;
        activeSound = null;
        return;
    }

    const sound = activeSound;

    activeTrack = null;
    activeSound = null;
    scene.tweens.killTweensOf(sound);

    if (immediate)
    {
        sound.stop();
        return;
    }

    scene.tweens.add({
        targets: sound,
        volume: 0,
        duration: CROSSFADE_MS,
        ease: 'Sine.easeInOut',
        onComplete: () => sound.stop(),
    });
};

export const getActiveBgmTrack = (): BgmTrack | null => activeTrack;
