import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import { generateRunMap } from './runMap';

describe('runMap', () =>
{
    it('assigns sign-matcher to the first event node in column zero', () =>
    {
        seedScope('map-test', 'map');
        const map = generateRunMap();
        const rowZeroEvents = map.nodes
            .filter((node) => node.row === 0 && node.kind === 'event')
            .sort((a, b) => a.col - b.col);

        expect(rowZeroEvents.length).toBeGreaterThanOrEqual(1);
        expect(rowZeroEvents[0]?.eventId).toBe('sign-matcher');
    });

    it('assigns distinct events within the same column when possible', () =>
    {
        seedScope('map-distinct', 'map');
        const map = generateRunMap();
        const rowZeroEvents = map.nodes
            .filter((node) => node.row === 0 && node.kind === 'event')
            .map((node) => node.eventId);

        expect(new Set(rowZeroEvents).size).toBe(rowZeroEvents.length);
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
