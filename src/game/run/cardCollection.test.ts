import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CARD_DEFINITIONS } from '../cardGame/config/cardRegistry';
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

    it('catalogs base cards from cards.json and excludes non-collectibles / upgrades', () =>
    {
        const ids = getCollectionCatalogIds();

        expect(ids).toContain('attack');
        expect(ids).toContain('switchback');
        expect(ids).toContain('execution');
        expect(ids).not.toContain('burden');
        expect(ids).not.toContain('fuse');
        expect(ids).not.toContain('hazard');
        expect(ids).not.toContain('boost');
        expect(ids).not.toContain('attack-plus');
        expect(ids).not.toContain('loop-reset');
    });

    it('includes every base card that does not opt out with collectible: false', () =>
    {
        const catalog = new Set(getCollectionCatalogIds());

        for (const definition of CARD_DEFINITIONS)
        {
            if (definition.upgradeOf || definition.collectible === false)
            {
                expect(catalog.has(definition.id)).toBe(false);
                continue;
            }

            expect(catalog.has(definition.id)).toBe(true);
        }
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
