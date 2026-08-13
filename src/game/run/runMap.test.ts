import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import {
    FLOOR_COLUMN_RANGES,
    generateRunMap,
    getFloorColumnRange,
    getFloorForColumn,
    getNode,
    projectIndex,
    RUN_CONFIG,
} from './runMap';

describe('runMap', () =>
{
    it('maps columns onto three logical floors', () =>
    {
        expect(FLOOR_COLUMN_RANGES).toHaveLength(RUN_CONFIG.floorCount);
        expect(getFloorForColumn(0)).toBe(1);
        expect(getFloorForColumn(3)).toBe(1);
        expect(getFloorForColumn(4)).toBe(2);
        expect(getFloorForColumn(7)).toBe(2);
        expect(getFloorForColumn(8)).toBe(3);
        expect(getFloorForColumn(10)).toBe(3);
        expect(getFloorColumnRange(1)).toEqual({ startCol: 0, endCol: 3 });
        expect(getFloorColumnRange(3)).toEqual({ startCol: 8, endCol: 10 });
    });

    it('gives saboteur nodes adjacent routes on the next column', () =>
    {
        let checkedSaboteur = false;

        for (let attempt = 0; attempt < 40; attempt++)
        {
            seedScope(`saboteur-routes-${attempt}`, 'map');
            const map = generateRunMap();

            for (const node of map.nodes)
            {
                if (node.enemyId !== 'saboteur' || node.row >= map.rows - 1)
                {
                    continue;
                }

                const nextRow = map.nodes.filter((next) => next.row === node.row + 1);

                if (nextRow.length <= 1)
                {
                    continue;
                }

                checkedSaboteur = true;
                const primaryCol = projectIndex(node.col, node.colCount, nextRow.length);
                const destinations = node.nextIds.map((id) => getNode(map, id)!);
                const hasAdjacentRoute = destinations.some((next) => next.col !== primaryCol);

                expect(hasAdjacentRoute).toBe(true);
            }
        }

        expect(checkedSaboteur).toBe(true);
    });

    it('always places semi-boss fights in the fourth column', () =>
    {
        seedScope('map-semi-boss', 'map');
        const map = generateRunMap();
        const semiBossRow = map.nodes.filter((node) => node.row === RUN_CONFIG.semiBossRow);

        expect(semiBossRow.length).toBeGreaterThanOrEqual(1);
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
        seedScope('map-signals', 'map');
        const map = generateRunMap();
        const eventNodes = map.nodes.filter((node) => node.kind === 'event');

        expect(eventNodes.length).toBeGreaterThan(0);
        expect(eventNodes.every((node) => node.eventId === undefined)).toBe(true);
        expect(eventNodes.every((node) => node.enemyId === undefined)).toBe(true);
    });
});
