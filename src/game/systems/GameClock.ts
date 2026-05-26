import { MAX_TICKS_PER_FRAME, TICK_DURATION_MS } from '../config/gameClockConfig';

export class GameClock
{
    private accumulatorMs = 0;
    private _currentTick = 0;

    get currentTick (): number
    {
        return this._currentTick;
    }

    /** Returns how many simulation ticks to run this frame. */
    consumeFrame (deltaMs: number): number
    {
        this.accumulatorMs += deltaMs;

        let ticksToRun = 0;

        while (
            this.accumulatorMs >= TICK_DURATION_MS
            && ticksToRun < MAX_TICKS_PER_FRAME
        )
        {
            this.accumulatorMs -= TICK_DURATION_MS;
            ticksToRun++;
        }

        return ticksToRun;
    }

    /** Advances the global tick counter once; call exactly once per simulation step. */
    step (): number
    {
        this._currentTick++;

        return this._currentTick;
    }

    reset (): void
    {
        this.accumulatorMs = 0;
        this._currentTick = 0;
    }
}
