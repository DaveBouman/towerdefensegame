import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getBestiaryCatalogIds,
    getBestiaryEntries,
    getBestiaryProgress,
    readUnlockedEnemyIds,
    toBestiaryEnemyId,
    unlockEnemies,
} from './enemyBestiary';

const memoryStore = new Map<string, string>();

describe('enemyBestiary', () =>
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

    it('catalogs combat enemies and excludes the training dummy', () =>
    {
        const ids = getBestiaryCatalogIds();

        expect(ids).toContain('basic');
        expect(ids).toContain('warden');
        expect(ids).toContain('field-medic');
        expect(ids).not.toContain('training-dummy');
    });

    it('rejects non-roster ids', () =>
    {
        expect(toBestiaryEnemyId('training-dummy')).toBeNull();
        expect(toBestiaryEnemyId('basic')).toBe('basic');
        expect(toBestiaryEnemyId('missing')).toBeNull();
    });

    it('unlocks newly encountered enemies once', () =>
    {
        expect(getBestiaryProgress().unlocked).toBe(0);
        expect(unlockEnemies([ 'basic', 'basic', 'thornward' ])).toBe(2);
        expect(unlockEnemies([ 'thornward' ])).toBe(0);
        expect(readUnlockedEnemyIds().has('basic')).toBe(true);

        const entries = getBestiaryEntries();
        expect(entries.find((entry) => entry.id === 'basic')?.unlocked).toBe(true);
        expect(entries.find((entry) => entry.id === 'warden')?.unlocked).toBe(false);
    });
});
