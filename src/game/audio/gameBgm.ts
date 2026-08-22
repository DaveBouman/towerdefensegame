import type Phaser from 'phaser';
import {
    ALL_BGM_TRACKS,
    BGM_FILES,
    BGM_LEVEL,
    type BgmTrack,
} from './bgmManifest';
import { getEffectiveMusicGain } from './audioSettings';
import {
    ensureAudioUnlocked,
    getAudioSettings,
    onAudioUnlocked,
    subscribeSfxSettings,
} from './gameAudio';

const CROSSFADE_MS = 1400;

let scene: Phaser.Scene | null = null;
let loaded = false;
let activeTrack: BgmTrack | null = null;
let activeSound: Phaser.Sound.WebAudioSound | null = null;
let pendingTrack: BgmTrack | null = null;
let unsubscribeSettings: (() => void) | null = null;
let unsubscribeUnlock: (() => void) | null = null;

const getTargetVolume = (track: BgmTrack): number =>
    getEffectiveMusicGain(getAudioSettings()) * BGM_LEVEL[track];

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

    unsubscribeUnlock?.();
    unsubscribeUnlock = onAudioUnlocked(() =>
    {
        if (pendingTrack)
        {
            const track = pendingTrack;
            pendingTrack = null;
            crossfadeTo(track);
            return;
        }

        if (activeTrack)
        {
            const track = activeTrack;
            activeTrack = null;
            crossfadeTo(track);
        }
    });
};

export const unbindGameBgmScene = (): void =>
{
    unsubscribeSettings?.();
    unsubscribeSettings = null;
    unsubscribeUnlock?.();
    unsubscribeUnlock = null;
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

const startLoopPlayback = (sound: Phaser.Sound.WebAudioSound, volume: number): boolean =>
{
    scene?.tweens.killTweensOf(sound);

    if (sound.isPlaying)
    {
        sound.setVolume(volume);
        return true;
    }

    return sound.play({ volume, loop: true });
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
            void ensureAudioUnlocked();
            startLoopPlayback(activeSound, volume);
        }
        catch
        {
            /* autoplay blocked until user gesture */
        }
    }
};

export const crossfadeTo = (track: BgmTrack): void =>
{
    void ensureAudioUnlocked();

    if (!scene || !loaded)
    {
        pendingTrack = track;
        return;
    }

    const targetVolume = getTargetVolume(track);

    if (activeTrack === track && activeSound?.isPlaying && targetVolume > 0)
    {
        activeSound.setVolume(targetVolume);
        return;
    }

    const nextSound = getSound(track);

    if (!nextSound)
    {
        pendingTrack = track;
        return;
    }

    const previous = activeSound;

    activeTrack = track;
    activeSound = nextSound;

    if (!nextSound.isPlaying)
    {
        try
        {
            const started = startLoopPlayback(
                nextSound,
                previous === nextSound ? targetVolume : 0,
            );

            if (!started)
            {
                pendingTrack = track;
            }
        }
        catch
        {
            pendingTrack = track;
            return;
        }
    }

    scene.tweens.killTweensOf(nextSound);

    if (previous === nextSound)
    {
        nextSound.setVolume(targetVolume);
        return;
    }

    nextSound.setVolume(0);
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
