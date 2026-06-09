import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';
import { FlowField } from './flowField';
import { tileKey } from './tileKey';

describe('FlowField', () =>
{
    const grid = new Grid(GRID_CONFIG);

    it('points downhill toward a single goal tile', () =>
    {
        const goal = { col: 5, row: 20 };
        const blocked = new Set<string>();
        const field = FlowField.build(grid, [ goal ], blocked);
        const start = { col: 5, row: 25 };
        const direction = field.getDirectionAt(start);

        expect(direction).not.toBeNull();
        expect(direction!.y).toBeLessThan(0);
        expect(Math.abs(direction!.x)).toBeLessThan(0.2);
    });

    it('routes around blocked tiles', () =>
    {
        const goal = { col: 5, row: 20 };
        const blocked = new Set([
            tileKey({ col: 5, row: 21 }),
            tileKey({ col: 5, row: 22 }),
            tileKey({ col: 5, row: 23 }),
        ]);
        const field = FlowField.build(grid, [ goal ], blocked);

        expect(field.getDirectionAt({ col: 5, row: 22 })).toBeNull();
        expect(field.getDirectionAt({ col: 4, row: 22 })).not.toBeNull();
        expect(field.getDirectionAt({ col: 4, row: 22 })!.y).toBeLessThan(0);
    });

    it('returns blended world flow near tile centers', () =>
    {
        const goal = { col: 2, row: 10 };
        const field = FlowField.build(grid, [ goal ], new Set());
        const world = tileCenterWorld(GRID_CONFIG, { col: 2, row: 15 });
        const flow = field.getWorldFlowAt(world, grid);

        expect(flow).not.toBeNull();
        expect(flow!.y).toBeLessThan(0);
    });
});
