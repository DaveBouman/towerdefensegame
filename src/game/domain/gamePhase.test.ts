import { describe, expect, it } from 'vitest';
import {
    canManagePlacedTowers,
    canUpgradeUnits,
    isBetweenWaves,
    isCombatActive,
} from './gamePhase';

const base = {
    wave: 1,
    runOutcome: 'playing',
    canStartWave: false,
    upgradePick: null,
    towerDraftPick: null,
    deployment: null,
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

    it('isCombatActive is false after victory', () =>
    {
        expect(isCombatActive({ ...base, wave: 3, runOutcome: 'victory' })).toBe(false);
    });

    it('isBetweenWaves requires no living enemies', () =>
    {
        expect(isBetweenWaves({ canStartWave: true, upgradePick: null }, 0)).toBe(true);
        expect(isBetweenWaves({ canStartWave: true, upgradePick: null }, 1)).toBe(false);
    });

    it('canUpgradeUnits mirrors isBetweenWaves when enemy count is zero', () =>
    {
        expect(canUpgradeUnits({ canStartWave: true, upgradePick: null })).toBe(true);
        expect(canUpgradeUnits({ canStartWave: false, upgradePick: null })).toBe(false);
    });

    it('canManagePlacedTowers blocks during combat and reward picks', () =>
    {
        expect(canManagePlacedTowers({ ...base, wave: 2, canStartWave: false })).toBe(false);
        expect(canManagePlacedTowers({
            ...base,
            canStartWave: false,
            upgradePick: { choices: [ 'spyglass' ] },
        })).toBe(false);
    });

    it('canManagePlacedTowers allows deployment and between waves', () =>
    {
        expect(canManagePlacedTowers({
            ...base,
            wave: 0,
            canStartWave: false,
            deployment: {
                active: true,
                nextTowerId: 'militia',
                placedCount: 0,
                totalCount: 3,
                queue: [ 'militia' ],
            },
        })).toBe(true);

        expect(canManagePlacedTowers({ ...base, wave: 2, canStartWave: true })).toBe(true);
    });
});
