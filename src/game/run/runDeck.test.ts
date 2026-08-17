import { describe, expect, it } from 'vitest';
import {
    fromDefinitionIds,
    findNewDefinitionIdsNeedingDirection,
    groupRunDeckEntries,
    mergeDeckAfterEvent,
    removeMatchingDeckEntry,
    toDefinitionIds,
} from './runDeck';

describe('runDeck', () =>
{
    it('round-trips definition ids', () =>
    {
        const deck = fromDefinitionIds([ 'attack', 'defend', 'attack' ]);

        expect(toDefinitionIds(deck)).toEqual([ 'attack', 'defend', 'attack' ]);
    });

    it('mergeDeckAfterEvent keeps arrows on surviving cards', () =>
    {
        const before = [
            { definitionId: 'attack', arrow: 'left' as const },
            { definitionId: 'defend', arrow: 'up' as const },
        ];
        const after = mergeDeckAfterEvent(before, [ 'defend', 'attack', 'fire' ]);

        expect(after).toEqual([
            { definitionId: 'defend', arrow: 'up' },
            { definitionId: 'attack', arrow: 'left' },
            { definitionId: 'fire' },
        ]);
    });

    it('groups deck entries by definition and arrow', () =>
    {
        const entries = groupRunDeckEntries([
            { definitionId: 'attack', arrow: 'left' },
            { definitionId: 'attack', arrow: 'left' },
            { definitionId: 'attack', arrow: 'right' },
        ]);

        expect(entries).toHaveLength(2);
        expect(entries.find((entry) => entry.arrow === 'left')?.count).toBe(2);
        expect(entries.find((entry) => entry.arrow === 'right')?.count).toBe(1);
    });

    it('removeMatchingDeckEntry removes one grouped copy', () =>
    {
        const deck = [
            { definitionId: 'attack', arrow: 'left' as const },
            { definitionId: 'attack', arrow: 'left' as const },
        ];
        const next = removeMatchingDeckEntry(deck, {
            definitionId: 'attack',
            label: 'Attack',
            count: 2,
            arrow: 'left',
        });

        expect(next).toHaveLength(1);
    });

    it('findNewDefinitionIdsNeedingDirection detects event gains', () =>
    {
        const before = [ { definitionId: 'attack', arrow: 'left' as const } ];
        const after = [ ...before, { definitionId: 'fire' } ];
        expect(findNewDefinitionIdsNeedingDirection(before, after)).toEqual([ 'fire' ]);
    });
});
