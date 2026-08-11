import { describe, expect, it } from 'vitest';
import {
    ASCENSION_HP_BONUS_PER_LEVEL,
    MAX_ASCENSION_LEVEL,
    describeAscensionLevel,
    getAscensionEnemyHealthMultiplier,
    readAscensionLevel,
    writeAscensionLevel,
} from './ascension';

describe('ascension', () =>
{
    it('scales enemy integrity by 10% per level', () =>
    {
        expect(getAscensionEnemyHealthMultiplier(0)).toBe(1);
        expect(getAscensionEnemyHealthMultiplier(1)).toBeCloseTo(1 + ASCENSION_HP_BONUS_PER_LEVEL);
        expect(getAscensionEnemyHealthMultiplier(5)).toBeCloseTo(1 + 5 * ASCENSION_HP_BONUS_PER_LEVEL);
        expect(getAscensionEnemyHealthMultiplier(MAX_ASCENSION_LEVEL)).toBeCloseTo(
            1 + MAX_ASCENSION_LEVEL * ASCENSION_HP_BONUS_PER_LEVEL,
        );
    });

    it('persists ascension level in localStorage', () =>
    {
        const storage = new Map<string, string>();
        const original = globalThis.localStorage;

        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                getItem: (key: string) => storage.get(key) ?? null,
                setItem: (key: string, value: string) => { storage.set(key, value); },
            },
        });

        writeAscensionLevel(4);
        expect(readAscensionLevel()).toBe(4);
        writeAscensionLevel(0);

        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: original,
        });
    });

    it('describes ascension for the menu', () =>
    {
        expect(describeAscensionLevel(0)).toContain('Base');
        expect(describeAscensionLevel(3)).toContain('Ascension 3');
    });
});
