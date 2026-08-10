import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultDeckDefinitionIds } from '../cardGame/domain/buildPlayerDeck';
import {
    ensureStarterCollectionUnlocks,
    getCollectionCatalogIds,
    getCollectionEntries,
    getCollectionProgress,
    readUnlockedCardIds,
    toCollectionCardId,
    unlockCards,
} from './cardCollection';

const memoryStore = new Map<string, string>();

describe('cardCollection', () =>
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

    it('catalogs base collectible cards and excludes curses / upgrades', () =>
    {
        const ids = getCollectionCatalogIds();

        expect(ids).toContain('attack');
        expect(ids).toContain('switchback');
        expect(ids).not.toContain('burden');
        expect(ids).not.toContain('fuse');
        expect(ids).not.toContain('hazard');
        expect(ids).not.toContain('attack-plus');
        expect(ids).not.toContain('loop-reset');
    });

    it('unlocks starter deck cards by default', () =>
    {
        const added = ensureStarterCollectionUnlocks();
        const starters = [ ...new Set(getDefaultDeckDefinitionIds()) ];

        expect(added).toBe(starters.length);
        expect(getCollectionProgress().unlocked).toBe(starters.length);

        for (const id of starters)
        {
            expect(readUnlockedCardIds().has(id)).toBe(true);
        }
    });

    it('maps upgraded forms to their base collection id', () =>
    {
        expect(toCollectionCardId('attack-plus')).toBe('attack');
        expect(toCollectionCardId('burden')).toBeNull();
    });

    it('unlocks newly acquired cards once', () =>
    {
        ensureStarterCollectionUnlocks();
        expect(unlockCards([ 'execution', 'execution', 'attack' ])).toBe(1);
        expect(unlockCards([ 'execution' ])).toBe(0);

        const entries = getCollectionEntries();
        expect(entries.find((entry) => entry.id === 'execution')?.unlocked).toBe(true);
        expect(entries.find((entry) => entry.id === 'white-hot')?.unlocked).toBe(false);
    });
});
