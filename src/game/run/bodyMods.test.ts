import { describe, expect, it } from 'vitest';
import { isSeventhStrikeAttack, SEVENTH_STRIKE_INTERVAL } from './bodyMods';

describe('isSeventhStrikeAttack', () =>
{
    it('triggers on every seventh attack number', () =>
    {
        expect(SEVENTH_STRIKE_INTERVAL).toBe(7);

        for (let attack = 1; attack <= 21; attack++)
        {
            expect(isSeventhStrikeAttack(attack)).toBe(attack % 7 === 0);
        }
    });
});
