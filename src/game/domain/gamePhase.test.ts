import { describe, expect, it } from 'vitest';
import { canPlaceTowers, isCombatActive } from './gamePhase';

const base = {
    wave: 1,
    runOutcome: 'playing',
    canStartWave: false,
} as const;

describe('gamePhase', () =>
{
    it('isCombatActive during an active wave', () =>
    {
        expect(isCombatActive({ ...base, wave: 2, canStartWave: false })).toBe(true);
    });

    it('isCombatActive is false before wave 1 and between waves', () =>
    {
        expect(isCombatActive({ ...base, wave: 0, canStartWave: true })).toBe(false);
        expect(isCombatActive({ ...base, wave: 2, canStartWave: true })).toBe(false);
    });

    it('canPlaceTowers only between waves while playing', () =>
    {
        expect(canPlaceTowers({ wave: 0, runOutcome: 'playing', canStartWave: true })).toBe(true);
        expect(canPlaceTowers({ ...base, canStartWave: false })).toBe(false);
        expect(canPlaceTowers({ ...base, runOutcome: 'defeat', canStartWave: true })).toBe(false);
    });
});
