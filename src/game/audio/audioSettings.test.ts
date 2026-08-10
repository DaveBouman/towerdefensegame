import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getEffectiveMusicGain,
    getEffectiveSfxGain,
    readAudioSettings,
    writeAudioMuted,
    writeMasterVolume,
    writeMusicVolume,
    writeSfxVolume,
} from './audioSettings';

const memoryStore = new Map<string, string>();

describe('audioSettings', () =>
{
    beforeEach(() =>
    {
        memoryStore.clear();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => memoryStore.get(key) ?? null,
            setItem: (key: string, value: string) => { memoryStore.set(key, value); },
            removeItem: (key: string) => { memoryStore.delete(key); },
            clear: () => { memoryStore.clear(); },
        });
    });

    it('migrates legacy single volume into master with full buses', () =>
    {
        memoryStore.set('td-game-sfx-volume', '0.5');

        const settings = readAudioSettings();

        expect(settings.masterVolume).toBe(0.5);
        expect(settings.sfxVolume).toBe(1);
        expect(settings.musicVolume).toBe(1);
    });

    it('reads split buses when master key exists', () =>
    {
        writeMasterVolume(0.8);
        writeSfxVolume(0.4);
        writeMusicVolume(0.6);
        writeAudioMuted(false);

        const settings = readAudioSettings();

        expect(settings).toEqual({
            muted: false,
            masterVolume: 0.8,
            sfxVolume: 0.4,
            musicVolume: 0.6,
        });
        expect(getEffectiveSfxGain(settings)).toBeCloseTo(0.32);
        expect(getEffectiveMusicGain(settings)).toBeCloseTo(0.48);
    });

    it('returns zero gain when muted', () =>
    {
        const settings = {
            muted: true,
            masterVolume: 1,
            sfxVolume: 1,
            musicVolume: 1,
        };

        expect(getEffectiveSfxGain(settings)).toBe(0);
        expect(getEffectiveMusicGain(settings)).toBe(0);
    });
});
