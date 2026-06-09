import { describe, expect, it } from 'vitest';
import { computeKillRatingModifiers } from './towerKillRating';

describe('computeKillRatingModifiers', () =>
{
    it('scales permanent stats by kills and kill rating', () =>
    {
        expect(computeKillRatingModifiers(10, 1)).toEqual({
            damage: 3.5,
            maxHealth: 20,
        });
        expect(computeKillRatingModifiers(10, 1.5)).toEqual({
            damage: 5.25,
            maxHealth: 30,
        });
    });
});
