import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_TEXT_SCALE,
    TEXT_SCALE_VALUES,
    applyTextScale,
    readTextScale,
    setTextScale,
    writeTextScale,
} from './textScale';

const memoryStore = new Map<string, string>();
const styleProps = new Map<string, string>();

describe('textScale', () =>
{
    beforeEach(() =>
    {
        memoryStore.clear();
        styleProps.clear();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => memoryStore.get(key) ?? null,
            setItem: (key: string, value: string) => { memoryStore.set(key, value); },
            removeItem: (key: string) => { memoryStore.delete(key); },
            clear: () => { memoryStore.clear(); },
        });
        vi.stubGlobal('document', {
            documentElement: {
                style: {
                    setProperty: (key: string, value: string) => { styleProps.set(key, value); },
                    removeProperty: (key: string) => { styleProps.delete(key); },
                    getPropertyValue: (key: string) => styleProps.get(key) ?? '',
                },
            },
        });
    });

    it('defaults to medium', () =>
    {
        expect(readTextScale()).toBe(DEFAULT_TEXT_SCALE);
        expect(TEXT_SCALE_VALUES.medium).toBe(1.15);
    });

    it('persists and applies scale', () =>
    {
        setTextScale('large');

        expect(readTextScale()).toBe('large');
        expect(styleProps.get('--text-scale')).toBe('1.3');
    });

    it('ignores invalid stored values', () =>
    {
        memoryStore.set('td-game-text-scale', 'huge');
        expect(readTextScale()).toBe('medium');
    });

    it('write + apply without changing storage twice', () =>
    {
        writeTextScale('small');
        applyTextScale('small');

        expect(memoryStore.get('td-game-text-scale')).toBe('small');
        expect(styleProps.get('--text-scale')).toBe('1');
    });
});
