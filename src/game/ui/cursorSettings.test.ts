import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_CURSOR_COLOR,
    applyCursorColor,
    buildCursorUrls,
    readCursorColor,
    setCursorColor,
} from './cursorSettings';

describe('cursorSettings', () =>
{
    afterEach(() =>
    {
        vi.unstubAllGlobals();
    });

    it('falls back to blue when storage is missing or invalid', () =>
    {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
        });

        expect(readCursorColor()).toBe(DEFAULT_CURSOR_COLOR);
    });

    it('builds color-specific cursor asset paths', () =>
    {
        expect(buildCursorUrls('purple').default).toContain('/purple/default.svg');
        expect(buildCursorUrls('green').pointer).toContain('/green/default.svg');
        expect(buildCursorUrls('purple').text).toContain('/purple/text.svg');
    });

    it('persists and applies the chosen accent color', () =>
    {
        const setProperty = vi.fn();
        const storage = new Map<string, string>();

        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) =>
            {
                storage.set(key, value);
            },
        });
        vi.stubGlobal('document', {
            documentElement: { style: { setProperty } },
        });

        setCursorColor('green');

        expect(storage.get('signal-chain-cursor-color')).toBe('green');
        expect(setProperty).toHaveBeenCalledWith('--cursor-default', buildCursorUrls('green').default);
    });

    it('applyCursorColor uses stored color by default', () =>
    {
        const setProperty = vi.fn();

        vi.stubGlobal('localStorage', {
            getItem: vi.fn(() => 'purple'),
            setItem: vi.fn(),
        });
        vi.stubGlobal('document', {
            documentElement: { style: { setProperty } },
        });

        applyCursorColor();

        expect(setProperty).toHaveBeenCalledWith('--cursor-pointer', buildCursorUrls('purple').pointer);
    });
});
