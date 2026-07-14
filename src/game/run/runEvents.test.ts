import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import {
    applyRunEventEffects,
    buildIconMatchRound,
    getRunEvent,
    rollRunEventId,
    rollWheelSegment,
} from './runEvents';

describe('runEvents', () =>
{
    it('loads event definitions', () =>
    {
        expect(getRunEvent('wheel-of-fate').title).toBe('Wheel of Fate');
        expect(getRunEvent('sign-matcher').choices).toHaveLength(1);
        expect(getRunEvent('healing-spring').choices).toHaveLength(2);
    });

    it('rolls events deterministically per node seed', () =>
    {
        seedScope('test-seed', 'event:n0-0');
        const first = rollRunEventId();

        seedScope('test-seed', 'event:n0-0');
        const second = rollRunEventId();

        seedScope('test-seed', 'event:n0-1');
        const otherNode = rollRunEventId();

        expect(first).toBe(second);
        expect(typeof first).toBe('string');
        expect(getRunEvent(first).id).toBe(first);
        expect(otherNode).toBeTruthy();
    });

    it('rolls wheel segments deterministically', () =>
    {
        seedScope('wheel-seed', 'event:n1-0:wheel');
        const a = rollWheelSegment().id;

        seedScope('wheel-seed', 'event:n1-0:wheel');
        const b = rollWheelSegment().id;

        expect(a).toBe(b);
    });

    it('builds icon match rounds with exactly one duplicated icon', () =>
    {
        seedScope('match-seed', 'event:n2-0:match');
        const round = buildIconMatchRound();

        expect(round.options).toHaveLength(3);

        const matches = round.options.filter((icon) => icon === round.winningIcon);

        expect(matches).toHaveLength(2);
    });

    it('applies heal and gold effects', () =>
    {
        const result = applyRunEventEffects(
            [
                { kind: 'heal', amount: 10 },
                { kind: 'gold', amount: 15 },
            ],
            {
                playerHealth: 40,
                maxHealth: 80,
                gold: 5,
                deck: [],
                trinkets: [],
            },
        );

        expect(result.playerHealth).toBe(50);
        expect(result.gold).toBe(20);
        expect(result.messages).toHaveLength(2);
    });
});
