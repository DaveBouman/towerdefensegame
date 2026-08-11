import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ASCENSION_HP_BONUS_PER_LEVEL,
    MAX_ASCENSION_LEVEL,
    clampSelectableAscension,
    describeAscensionLevel,
    describeAscensionUnlockHint,
    getAscensionEnemyHealthMultiplier,
    readAscensionLevel,
    readMaxUnlockedAscension,
    recordAscensionClear,
    writeAscensionLevel,
} from './ascension';

let store: Record<string, string> = {};

describe('ascension', () =>
{
    beforeEach(() =>
    {
        store = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => { store[key] = value; },
            removeItem: (key: string) => { delete store[key]; },
        });
    });

    afterEach(() =>
    {
        vi.unstubAllGlobals();
    });

    it('scales enemy integrity by 10% per level', () =>
    {
        expect(getAscensionEnemyHealthMultiplier(0)).toBe(1);
        expect(getAscensionEnemyHealthMultiplier(1)).toBeCloseTo(1 + ASCENSION_HP_BONUS_PER_LEVEL);
        expect(getAscensionEnemyHealthMultiplier(5)).toBeCloseTo(1 + 5 * ASCENSION_HP_BONUS_PER_LEVEL);
        expect(getAscensionEnemyHealthMultiplier(MAX_ASCENSION_LEVEL)).toBeCloseTo(
            1 + MAX_ASCENSION_LEVEL * ASCENSION_HP_BONUS_PER_LEVEL,
        );
    });

    it('starts with only base difficulty selectable', () =>
    {
        expect(readMaxUnlockedAscension()).toBe(0);
        expect(clampSelectableAscension(5)).toBe(0);
        expect(readAscensionLevel()).toBe(0);
    });

    it('unlocks the next tier only after clearing the Warden at the current tier', () =>
    {
        expect(recordAscensionClear(0)).toBe(1);
        expect(readMaxUnlockedAscension()).toBe(1);
        expect(clampSelectableAscension(1)).toBe(1);
        expect(clampSelectableAscension(2)).toBe(1);

        expect(recordAscensionClear(0)).toBe(1);
        expect(recordAscensionClear(1)).toBe(2);
        expect(readMaxUnlockedAscension()).toBe(2);
    });

    it('persists selected ascension clamped to unlocked tiers', () =>
    {
        recordAscensionClear(0);
        writeAscensionLevel(1);
        expect(readAscensionLevel()).toBe(1);
        expect(clampSelectableAscension(5)).toBe(1);

        recordAscensionClear(1);
        writeAscensionLevel(5);
        expect(readAscensionLevel()).toBe(2);
    });

    it('describes ascension for the menu', () =>
    {
        expect(describeAscensionLevel(0)).toContain('Base');
        expect(describeAscensionLevel(3)).toContain('Ascension 3');
        expect(describeAscensionUnlockHint(0)).toContain('Ascension 1');
    });
});
