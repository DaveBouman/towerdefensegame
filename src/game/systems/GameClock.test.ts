import { describe, expect, it } from 'vitest';
import { TICK_DURATION_MS } from '../config/gameClockConfig';
import { GameClock } from './GameClock';

describe('GameClock', () =>
{
    it('accumulates frame time into discrete ticks', () =>
    {
        const clock = new GameClock();

        expect(clock.consumeFrame(TICK_DURATION_MS - 1)).toBe(0);
        expect(clock.consumeFrame(1)).toBe(1);
        expect(clock.step()).toBe(1);
    });

    it('resets tick counter', () =>
    {
        const clock = new GameClock();

        clock.consumeFrame(TICK_DURATION_MS);
        clock.step();
        clock.reset();

        expect(clock.currentTick).toBe(0);
    });
});
