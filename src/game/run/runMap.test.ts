import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import {
    FLOOR_COLUMN_RANGES,
    generateRunMap,
    getFloorColumnRange,
    getFloorForColumn,
    RUN_CONFIG,
} from './runMap';

describe('runMap', () =>
{
    it('maps columns onto three reward-depth bands on Floor 1', () =>
    {
        expect(FLOOR_COLUMN_RANGES).toHaveLength(RUN_CONFIG.floorCount);
        expect(RUN_CONFIG.mapFloorCount).toBe(1);
        expect(getFloorForColumn(0)).toBe(1);
        expect(getFloorForColumn(3)).toBe(1);
        expect(getFloorForColumn(4)).toBe(2);
        expect(getFloorForColumn(7)).toBe(2);
        expect(getFloorForColumn(8)).toBe(3);
        expect(getFloorForColumn(10)).toBe(3);
        expect(getFloorColumnRange(1)).toEqual({ startCol: 0, endCol: 3 });
        expect(getFloorColumnRange(3)).toEqual({ startCol: 8, endCol: 10 });
    });

    it('is a linear path with one node per column', () =>
    {
        seedScope('map-linear', 'map');
        const map = generateRunMap();

        expect(map.nodes).toHaveLength(map.rows);

        for (let row = 0; row < map.rows; row++)
        {
            const column = map.nodes.filter((node) => node.row === row);

            expect(column).toHaveLength(1);
            expect(column[0]!.colCount).toBe(1);
        }

        for (const node of map.nodes)
        {
            if (node.row >= map.rows - 1)
            {
                expect(node.nextIds).toHaveLength(0);
                continue;
            }

            expect(node.nextIds).toEqual([ `n${node.row + 1}-0` ]);
        }
    });

    it('always places semi-boss fights in the fourth column', () =>
    {
        seedScope('map-semi-boss', 'map');
        const map = generateRunMap();
        const semiBossRow = map.nodes.filter((node) => node.row === RUN_CONFIG.semiBossRow);

        expect(semiBossRow).toHaveLength(1);
        expect(semiBossRow.every((node) => node.kind === 'semi-boss')).toBe(true);
        expect(semiBossRow.every((node) => node.enemyId === 'smokebinder' || node.enemyId === 'saboteur')).toBe(true);
    });

    it('has nine columns between the first fight and the boss', () =>
    {
        seedScope('map-length', 'map');
        const map = generateRunMap();

        expect(map.rows).toBe(RUN_CONFIG.middleColumns + 2);
        expect(map.nodes.some((node) => node.row === 0 && node.kind === 'enemy')).toBe(true);
        expect(map.nodes.filter((node) => node.row === map.rows - 1).every((node) => node.kind === 'boss')).toBe(true);
    });

    it('always places enemies in the first column', () =>
    {
        seedScope('map-test', 'map');
        const map = generateRunMap();
        const rowZero = map.nodes.filter((node) => node.row === 0);

        expect(rowZero.length).toBeGreaterThanOrEqual(1);
        expect(rowZero.every((node) => node.kind === 'enemy')).toBe(true);
        expect(rowZero.every((node) => node.enemyId !== undefined)).toBe(true);
        expect(rowZero.every((node) => node.enemyIds?.length === 2)).toBe(true);
        expect(rowZero.every((node) => node.enemyIds?.every((id) => id === 'basic'))).toBe(true);
        expect(rowZero.every((node) => node.reward?.kind === 'card' && node.reward.pool === 'standard')).toBe(true);
    });

    it('gives lieutenants compound card + body mod rewards', () =>
    {
        seedScope('map-semi-boss-reward', 'map');
        const map = generateRunMap();
        const semiBossRow = map.nodes.filter((node) => node.kind === 'semi-boss');

        expect(semiBossRow.every((node) => node.reward?.kind === 'compound')).toBe(true);
    });

    it('never connects two Ripperdocs along a route edge', () =>
    {
        for (let attempt = 0; attempt < 50; attempt++)
        {
            seedScope(`map-no-adjacent-shops-${attempt}`, 'map');
            const map = generateRunMap();
            const byId = new Map(map.nodes.map((node) => [ node.id, node ]));

            for (const node of map.nodes)
            {
                if (node.kind !== 'shop')
                {
                    continue;
                }

                for (const nextId of node.nextIds)
                {
                    expect(byId.get(nextId)?.kind).not.toBe('shop');
                }
            }
        }
    });

    it('always places safehouses in the column before the warden', () =>
    {
        seedScope('map-rest', 'map');
        const map = generateRunMap();
        const preBossRow = map.nodes.filter((node) => node.row === map.rows - 2);

        expect(preBossRow.length).toBeGreaterThan(0);
        expect(preBossRow.every((node) => node.kind === 'rest')).toBe(true);
        expect(preBossRow.every((node) => node.enemyId === undefined)).toBe(true);
    });

    it('leaves signal nodes unresolved until the player visits', () =>
    {
        let eventNodes: ReturnType<typeof generateRunMap>['nodes'] = [];

        for (let attempt = 0; attempt < 40; attempt++)
        {
            seedScope(`map-signals-${attempt}`, 'map');
            const map = generateRunMap();
            eventNodes = map.nodes.filter((node) => node.kind === 'event');

            if (eventNodes.length > 0)
            {
                break;
            }
        }

        expect(eventNodes.length).toBeGreaterThan(0);
        expect(eventNodes.every((node) => node.eventId === undefined)).toBe(true);
        expect(eventNodes.every((node) => node.enemyId === undefined)).toBe(true);
    });
});
