import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import {
    getSignalAmbushChance,
    resolveSignalVisit,
} from './signalEncounter';
import { getRunEvent } from './runEvents';

describe('signalEncounter', () =>
{
    it('never ambushes on the first signal visit', () =>
    {
        expect(getSignalAmbushChance(0)).toBe(0);

        seedScope('signal-first', 'signal:n2-1');

        for (let i = 0; i < 20; i++)
        {
            expect(resolveSignalVisit(0, 2).kind).toBe('event');
        }
    });

    it('increases ambush chance after prior signal visits', () =>
    {
        expect(getSignalAmbushChance(1)).toBeGreaterThan(0);
        expect(getSignalAmbushChance(3)).toBeGreaterThan(getSignalAmbushChance(1));
        expect(getSignalAmbushChance(10)).toBeLessThanOrEqual(0.72);
    });

    it('can roll ambushes on later signal visits', () =>
    {
        let ambush: ReturnType<typeof resolveSignalVisit> | undefined;

        for (let i = 0; i < 40; i++)
        {
            seedScope('signal-ambush-scan', `signal:n5-${i}`);
            const outcome = resolveSignalVisit(3, 5);

            if (outcome.kind === 'ambush')
            {
                ambush = outcome;
                break;
            }
        }

        expect(ambush?.kind).toBe('ambush');

        if (ambush?.kind === 'ambush')
        {
            expect(ambush.enemyId).toBeTruthy();
            expect(ambush.reward.kind).toBe('card');
        }
    });

    it('rolls distinct events when not ambushed', () =>
    {
        seedScope('signal-event', 'signal:n3-2');
        const outcome = resolveSignalVisit(0, 3);

        expect(outcome.kind).toBe('event');

        if (outcome.kind === 'event')
        {
            expect(() => getRunEvent(outcome.eventId)).not.toThrow();
        }
    });
});
