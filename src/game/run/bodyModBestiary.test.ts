import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getBodyModBestiaryEntries,
    getBodyModBestiaryProgress,
    getBodyModCatalogIds,
    readUnlockedBodyModIds,
    unlockBodyMods,
} from './bodyModBestiary';
import { BODY_MOD_IDS } from './bodyMods';

const memoryStore = new Map<string, string>();

describe('bodyModBestiary', () =>
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

    it('catalogs every body mod', () =>
    {
        const ids = getBodyModCatalogIds();

        expect(ids).toContain(BODY_MOD_IDS.chromeHeart);
        expect(ids).toContain(BODY_MOD_IDS.gatekeeperSeal);
        expect(ids).toContain(BODY_MOD_IDS.latchArray);
        expect(ids.length).toBe(14);
    });

    it('unlocks newly collected body mods once', () =>
    {
        expect(getBodyModBestiaryProgress().unlocked).toBe(0);
        expect(unlockBodyMods([ BODY_MOD_IDS.markSeven, BODY_MOD_IDS.markSeven ])).toBe(1);
        expect(unlockBodyMods([ BODY_MOD_IDS.markSeven, BODY_MOD_IDS.latchArray ])).toBe(1);
        expect(readUnlockedBodyModIds().has(BODY_MOD_IDS.markSeven)).toBe(true);

        const entries = getBodyModBestiaryEntries();
        expect(entries.find((entry) => entry.id === BODY_MOD_IDS.latchArray)?.unlocked).toBe(true);
        expect(entries.find((entry) => entry.id === BODY_MOD_IDS.chromeHeart)?.unlocked).toBe(false);
    });

    it('migrates legacy relic bestiary storage', () =>
    {
        memoryStore.set(
            'signal-chain-relic-bestiary',
            JSON.stringify([ BODY_MOD_IDS.credSiphon ]),
        );

        expect(readUnlockedBodyModIds().has(BODY_MOD_IDS.credSiphon)).toBe(true);
        expect(memoryStore.get('signal-chain-body-mod-bestiary')).toContain(BODY_MOD_IDS.credSiphon);
    });
});
