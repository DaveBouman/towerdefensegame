import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ALL_SAVED_DATA_KEYS, clearAllSavedDataKeys, resetAllSavedData } from './resetAllSavedData';

describe('resetAllSavedData', () =>
{
    beforeEach(() =>
    {
        vi.stubGlobal('localStorage', {
            store: {} as Record<string, string>,
            getItem(key: string)
            {
                return this.store[key] ?? null;
            },
            setItem(key: string, value: string)
            {
                this.store[key] = value;
            },
            removeItem(key: string)
            {
                delete this.store[key];
            },
        });
    });

    it('lists every known persistence key once', () =>
    {
        const unique = new Set(ALL_SAVED_DATA_KEYS);
        expect(unique.size).toBe(ALL_SAVED_DATA_KEYS.length);
    });

    it('removes all saved keys', () =>
    {
        for (const key of ALL_SAVED_DATA_KEYS)
        {
            localStorage.setItem(key, 'test');
        }

        clearAllSavedDataKeys();

        for (const key of ALL_SAVED_DATA_KEYS)
        {
            expect(localStorage.getItem(key)).toBeNull();
        }
    });

    it('restores starter collection after a full reset', () =>
    {
        localStorage.setItem('signal-chain-card-collection', JSON.stringify([ 'attack' ]));
        localStorage.setItem('card-chain-has-seen-tutorial', '1');
        localStorage.setItem('signal-chain-ascension', '3');

        resetAllSavedData();

        expect(localStorage.getItem('card-chain-has-seen-tutorial')).toBeNull();
        expect(localStorage.getItem('signal-chain-ascension')).toBeNull();
        expect(localStorage.getItem('signal-chain-card-collection')).not.toBeNull();
    });
});
