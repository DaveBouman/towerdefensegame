import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import { generateRunMap, RUN_CONFIG } from './runMap';

describe('runMap', () =>
{
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
    });

    it('assigns distinct events within the same column when possible', () =>
    {
        seedScope('map-distinct', 'map');
        const map = generateRunMap();
        const eventNodes = map.nodes.filter((node) => node.kind === 'event');

        if (eventNodes.length < 2)
        {
            return;
        }

        const byRow = new Map<number, string[]>();

        for (const node of eventNodes)
        {
            const ids = byRow.get(node.row) ?? [];
            ids.push(node.eventId!);
            byRow.set(node.row, ids);
        }

        for (const ids of byRow.values())
        {
            if (ids.length > 1)
            {
                expect(new Set(ids).size).toBe(ids.length);
            }
        }
    });

    it('keeps event assignment deterministic per map seed', () =>
    {
        seedScope('stable-map', 'map');
        const first = generateRunMap().nodes.filter((node) => node.kind === 'event').map((node) => node.eventId);

        seedScope('stable-map', 'map');
        const second = generateRunMap().nodes.filter((node) => node.kind === 'event').map((node) => node.eventId);

        expect(second).toEqual(first);
    });
});
