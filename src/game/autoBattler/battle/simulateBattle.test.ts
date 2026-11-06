import { describe, expect, it, beforeEach } from 'vitest';
import { teamFromUnits } from '../shop';
import { createUnitInstance, resetAutoBattlerUidCounter } from '../unitRegistry';
import { simulateBattle } from './simulateBattle';

const teamOf = (...ids: string[]) =>
    teamFromUnits(ids.map((id) => createUnitInstance(id)));

describe('simulateBattle', () =>
{
    beforeEach(() =>
    {
        resetAutoBattlerUidCounter();
    });

    it('is deterministic for the same seed and teams', () =>
    {
        const a = teamOf('striker', 'ward');
        const b = teamOf('striker');

        const first = simulateBattle('SEED1', a, b);
        resetAutoBattlerUidCounter();
        const a2 = teamOf('striker', 'ward');
        const b2 = teamOf('striker');
        const second = simulateBattle('SEED1', a2, b2);

        expect(second.winner).toBe(first.winner);
        expect(second.log.map((event) => event.type)).toEqual(first.log.map((event) => event.type));
        expect(second.survivingA).toBe(first.survivingA);
        expect(second.survivingB).toBe(first.survivingB);
    });

    it('front units trade damage until one side is empty', () =>
    {
        const a = teamOf('striker');
        const b = teamOf('striker');
        const result = simulateBattle('DUEL', a, b);

        expect(result.log.some((event) => event.type === 'attack')).toBe(true);
        expect(result.log[result.log.length - 1]).toMatchObject({ type: 'end' });
        expect([ 'a', 'b', 'draw' ]).toContain(result.winner);
    });

    it('Blast snipes the enemy front at start of battle', () =>
    {
        const a = teamOf('blast');
        const b = teamOf('charge');
        const result = simulateBattle('SNIPE', a, b);

        expect(result.log.some((event) =>
            event.type === 'damage' && event.side === 'b' && event.amount === 2,
        )).toBe(true);
    });

    it('Charge summons a 1/1 on faint', () =>
    {
        const a = teamOf('surge');
        const b = teamOf('charge');
        const result = simulateBattle('SUMMON', a, b);

        expect(result.log.some((event) => event.type === 'summon' && event.side === 'b')).toBe(true);
    });
});
