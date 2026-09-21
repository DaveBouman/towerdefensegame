import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    isWindowMode,
    readStoredWindowMode,
    writeStoredWindowMode,
} from './windowMode';

describe('windowMode', () =>
{
    beforeEach(() =>
    {
        const store = new Map<string, string>();
        const localStorage = {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) =>
            {
                store.set(key, value);
            },
            removeItem: (key: string) =>
            {
                store.delete(key);
            },
        };

        vi.stubGlobal('localStorage', localStorage);
        vi.stubGlobal('window', {
            signalChainDesktop: { quit: vi.fn() },
            localStorage,
        });
    });

    it('validates modes', () =>
    {
        expect(isWindowMode('windowed')).toBe(true);
        expect(isWindowMode('borderless')).toBe(true);
        expect(isWindowMode('fullscreen')).toBe(true);
        expect(isWindowMode('nope')).toBe(false);
    });

    it('persists the selected mode', () =>
    {
        writeStoredWindowMode('borderless');
        expect(readStoredWindowMode()).toBe('borderless');
    });
});
