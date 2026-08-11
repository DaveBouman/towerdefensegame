import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ASCENSION_HP_BONUS_PER_LEVEL,
    MAX_ASCENSION_LEVEL,
    describeAscensionLevel,
    formatAscensionUnlockMessage,
    getAscensionEnemyHealthMultiplier,
    readRunAscensionLevel,
    recordAscensionClear,
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

    it('starts at ascension 0', () =>
    {
        expect(readRunAscensionLevel()).toBe(0);
    });

    it('increments the counter only after clearing the Warden at the current tier', () =>
    {
        expect(recordAscensionClear(0)).toBe(1);
        expect(readRunAscensionLevel()).toBe(1);

        expect(recordAscensionClear(0)).toBe(1);
        expect(recordAscensionClear(1)).toBe(2);
        expect(readRunAscensionLevel()).toBe(2);
    });

    it('formats unlock copy for the victory screen', () =>
    {
        expect(formatAscensionUnlockMessage(1)).toContain('Ascension 1 unlocked');
        expect(describeAscensionLevel(3)).toContain('Ascension 3');
    });
});
