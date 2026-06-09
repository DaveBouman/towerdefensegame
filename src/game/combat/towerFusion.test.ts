import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { getTowerFusionGroupMultiplier } from '../config/towerFusionConfig';
import { createTowerState } from '../domain/createTowerState';
import { Grid } from '../grid/Grid';
import {
    findTowerFusionGroups,
    getTowerFusionPreviewLinks,
    pickFusionAnchor,
} from './towerFusion';

const grid = new Grid(GRID_CONFIG);

describe('towerFusion', () =>
{
    it('groups three orthogonally adjacent towers of the same type', () =>
    {
        const a = createTowerState(grid, { col: 2, row: 35 }, 'militia');
        const b = createTowerState(grid, { col: 3, row: 35 }, 'militia');
        const c = createTowerState(grid, { col: 4, row: 35 }, 'militia');
        const scout = createTowerState(grid, { col: 5, row: 35 }, 'scout');

        const groups = findTowerFusionGroups([ a, b, c, scout ]);

        expect(groups).toHaveLength(1);
        expect(groups[0]).toHaveLength(3);
    });

    it('does not group different tower types together', () =>
    {
        const a = createTowerState(grid, { col: 2, row: 35 }, 'militia');
        const b = createTowerState(grid, { col: 3, row: 35 }, 'scout');
        const c = createTowerState(grid, { col: 4, row: 35 }, 'militia');

        expect(findTowerFusionGroups([ a, b, c ])).toHaveLength(0);
    });

    it('does not group towers that are only diagonally adjacent', () =>
    {
        const a = createTowerState(grid, { col: 2, row: 35 }, 'scout');
        const b = createTowerState(grid, { col: 3, row: 36 }, 'scout');
        const c = createTowerState(grid, { col: 4, row: 37 }, 'scout');

        expect(findTowerFusionGroups([ a, b, c ])).toHaveLength(0);
    });

    it('draws preview links along a fusion chain', () =>
    {
        const a = createTowerState(grid, { col: 1, row: 35 }, 'scout');
        const b = createTowerState(grid, { col: 2, row: 35 }, 'scout');
        const c = createTowerState(grid, { col: 3, row: 35 }, 'scout');

        const links = getTowerFusionPreviewLinks([ a, b, c ]);

        expect(links).toHaveLength(2);
    });

    it('picks the middle tile as the fusion anchor', () =>
    {
        const a = createTowerState(grid, { col: 1, row: 35 }, 'militia');
        const b = createTowerState(grid, { col: 2, row: 35 }, 'militia');
        const c = createTowerState(grid, { col: 3, row: 35 }, 'militia');

        expect(pickFusionAnchor([ a, b, c ]).id).toBe(b.id);
    });

    it('boosts only militia damage when three fuse', () =>
    {
        const anchor = createTowerState(grid, { col: 2, row: 35 }, 'militia');
        const b = createTowerState(grid, { col: 3, row: 35 }, 'militia');
        const c = createTowerState(grid, { col: 4, row: 35 }, 'militia');
        const baseDamage = anchor.damage;
        const baseHealth = anchor.maxHealth;
        const baseAttackSpeed = anchor.attacksPerSecond;

        anchor.completeFusion(3, [ b, c ]);

        expect(getTowerFusionGroupMultiplier(3)).toBeCloseTo(3.3);
        expect(anchor.damage).toBeCloseTo(baseDamage * 3.3);
        expect(anchor.maxHealth).toBeCloseTo(baseHealth);
        expect(anchor.attacksPerSecond).toBeCloseTo(baseAttackSpeed);
        expect(anchor.fusionGroupSize).toBe(3);
    });

    it('boosts scout move speed instead of damage when three fuse', () =>
    {
        const anchor = createTowerState(grid, { col: 2, row: 35 }, 'scout');
        const b = createTowerState(grid, { col: 3, row: 35 }, 'scout');
        const c = createTowerState(grid, { col: 4, row: 35 }, 'scout');
        const baseDamage = anchor.damage;
        const baseMoveSpeed = anchor.moveSpeedPerTick;

        anchor.completeFusion(3, [ b, c ]);

        expect(anchor.damage).toBeCloseTo(baseDamage);
        expect(anchor.moveSpeedPerTick).toBeCloseTo(baseMoveSpeed * 3.3);
    });
});
