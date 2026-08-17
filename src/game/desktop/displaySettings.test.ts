import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_DISPLAY_PRESET,
    DISPLAY_PRESETS,
    applyDisplayPreset,
    readDisplayPreset,
    writeDisplayPreset,
} from './displaySettings';

const memoryStore = new Map<string, string>();

describe('displaySettings', () =>
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
        vi.stubGlobal('window', {
            signalChainDesktop: {
                quit: vi.fn(),
                setDisplayPreset: vi.fn(),
            },
        });
    });

    it('lists only 16:9 presets plus adaptive', () =>
    {
        for (const preset of DISPLAY_PRESETS)
        {
            if (preset.width === null || preset.height === null)
            {
                continue;
            }

            expect(preset.width / preset.height).toBeCloseTo(16 / 9, 5);
        }
    });

    it('defaults to 1280x720 when unset', () =>
    {
        expect(readDisplayPreset()).toBe(DEFAULT_DISPLAY_PRESET);
    });

    it('persists the chosen preset', () =>
    {
        writeDisplayPreset('1920x1080');
        expect(readDisplayPreset()).toBe('1920x1080');
    });

    it('forwards preset changes to the desktop shell', async () =>
    {
        await applyDisplayPreset('1600x900');

        expect(window.signalChainDesktop?.setDisplayPreset).toHaveBeenCalledWith('1600x900');
        expect(readDisplayPreset()).toBe('1600x900');
    });
});
