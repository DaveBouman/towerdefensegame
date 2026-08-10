import { describe, expect, it } from 'vitest';
import {
    getCardRewardWeight,
    scoreDeckArchetypes,
} from './deckArchetypes';

describe('deckArchetypes', () =>
{
    it('scores an empty specialty deck as uncommitted', () =>
    {
        const scores = scoreDeckArchetypes([ 'joker', 'echo' ]);

        expect(scores.dominant).toBeNull();
        expect(scores.commitment).toBe(0);
    });

    it('detects a blade lead and boosts bleed offers', () =>
    {
        const scores = scoreDeckArchetypes([
            'attack', 'attack', 'rupture', 'shiv', 'lacerate', 'defend',
        ]);

        expect(scores.dominant).toBe('blade');
        expect(scores.commitment).toBeGreaterThan(0.3);
        expect(getCardRewardWeight('rupture', scores))
            .toBeGreaterThan(getCardRewardWeight('bulwark', scores));
    });
});
