import { describe, expect, it } from 'vitest';
import type { RunMapNode } from './runMap';
import { getMapNodeDisplay } from './mapNodeDisplay';

const node = (overrides: Partial<RunMapNode>): RunMapNode => ({
    id: 'n0-0',
    row: 0,
    col: 0,
    colCount: 1,
    kind: 'enemy',
    nextIds: [],
    ...overrides,
});

describe('mapNodeDisplay', () =>
{
    it('shows generic kind labels for regular enemies, shops, and events', () =>
    {
        expect(getMapNodeDisplay(node({ kind: 'enemy', enemyId: 'basic' })).label).toBe('Street Op');
        expect(getMapNodeDisplay(node({ kind: 'enemy', enemyId: 'thornward' })).label).toBe('Street Op');
        expect(getMapNodeDisplay(node({ kind: 'semi-boss', enemyId: 'smokebinder' })).label).toBe('Lieutenant');
        expect(getMapNodeDisplay(node({ kind: 'semi-boss', enemyId: 'saboteur' })).label).toBe('Lieutenant');
        expect(getMapNodeDisplay(node({ kind: 'shop' })).label).toBe('Ripperdoc');
        expect(getMapNodeDisplay(node({ kind: 'event', eventId: 'sign-matcher' })).label).toBe('Signal');
    });

    it('shows saboteur and warden names on the map when not a lieutenant node', () =>
    {
        expect(getMapNodeDisplay(node({ kind: 'enemy', enemyId: 'saboteur' })).label).toBe('Saboteur');
        expect(getMapNodeDisplay(node({ kind: 'boss', enemyId: 'warden' })).label).toBe('Warden');
    });

    it('hides specific event titles from map tooltips', () =>
    {
        const display = getMapNodeDisplay(node({ kind: 'event', eventId: 'wheel-of-fate' }));

        expect(display.tooltipTitle).toBe('Signal');
        expect(display.tooltipBody).not.toContain('Fate Spinner');
    });
});
