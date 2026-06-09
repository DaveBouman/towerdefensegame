import { describe, expect, it } from 'vitest';
import {
    computeStatUpgradeModifiers,
    getTowerStatUpgradeExpCost,
    getTowerStatUpgradesForArchetype,
    isStatUpgradeAvailableForArchetype,
    TOWER_STAT_UPGRADE_CATALOG,
} from './towerStatUpgradeCatalog';

describe('towerStatUpgradeCatalog', () =>
{
    it('returns shared upgrades for every archetype today', () =>
    {
        expect(getTowerStatUpgradesForArchetype('close')).toHaveLength(3);
        expect(getTowerStatUpgradesForArchetype('long')).toHaveLength(3);
    });

    it('can filter by archetype when configured', () =>
    {
        const closeOnly = {
            ...TOWER_STAT_UPGRADE_CATALOG[0],
            id: 'close-only-hp',
            archetypes: [ 'close' as const ],
        };

        expect(isStatUpgradeAvailableForArchetype(closeOnly, 'close')).toBe(true);
        expect(isStatUpgradeAvailableForArchetype(closeOnly, 'long')).toBe(false);
    });

    it('scales EXP cost with level', () =>
    {
        const def = TOWER_STAT_UPGRADE_CATALOG[0];

        expect(getTowerStatUpgradeExpCost(def, 0)).toBe(40);
        expect(getTowerStatUpgradeExpCost(def, 2)).toBe(70);
    });

    it('accumulates modifiers by level', () =>
    {
        const modifiers = computeStatUpgradeModifiers(
            { 'hp-boost': 2, 'strength-boost': 1 },
            'close',
        );

        expect(modifiers.maxHealth).toBe(50);
        expect(modifiers.damage).toBe(3);
    });
});
