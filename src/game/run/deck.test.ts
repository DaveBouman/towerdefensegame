import { describe, expect, it } from 'vitest';
import { removeCardsFromDeck } from './deck';

describe('removeCardsFromDeck', () =>
{
    it('removes one copy of each exhausted definition id', () =>
    {
        expect(removeCardsFromDeck([ 'attack', 'courier', 'defend' ], [ 'courier' ]))
            .toEqual([ 'attack', 'defend' ]);
    });

    it('removes multiple copies when the same id is exhausted more than once', () =>
    {
        expect(removeCardsFromDeck([ 'salvage', 'salvage', 'attack' ], [ 'salvage', 'salvage' ]))
            .toEqual([ 'attack' ]);
    });
});
