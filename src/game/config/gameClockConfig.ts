/** Fixed simulation rate — all gameplay systems advance on integer ticks. */
export const TICKS_PER_SECOND = 10;

export const TICK_DURATION_MS = 1000 / TICKS_PER_SECOND;

/** Prevents spiral-of-death when the tab lags; leftover time carries into the next frame. */
export const MAX_TICKS_PER_FRAME = 8;

export const msToTicks = (ms: number): number =>
    Math.max(0, Math.round(ms / TICK_DURATION_MS));

export const attacksPerSecondToIntervalTicks = (attacksPerSecond: number): number =>
{
    if (attacksPerSecond <= 0)
    {
        return Number.POSITIVE_INFINITY;
    }

    return Math.max(1, Math.round(TICKS_PER_SECOND / attacksPerSecond));
};

export const formatAttacksPerSecond = (attacksPerSecond: number): string =>
{
    const rounded = Math.round(attacksPerSecond * 100) / 100;

    return `${rounded}/s`;
};
