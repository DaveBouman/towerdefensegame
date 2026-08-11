const STORAGE_KEY = 'signal-chain-ascension';

export const MAX_ASCENSION_LEVEL = 10;

/** Extra enemy max HP per ascension level (10% each). */
export const ASCENSION_HP_BONUS_PER_LEVEL = 0.1;

export const getAscensionEnemyHealthMultiplier = (level: number): number =>
{
    const clamped = Math.max(0, Math.min(MAX_ASCENSION_LEVEL, Math.round(level)));

    return 1 + clamped * ASCENSION_HP_BONUS_PER_LEVEL;
};

export const readAscensionLevel = (): number =>
{
    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw === null)
        {
            return 0;
        }

        const parsed = Number.parseInt(raw, 10);

        return Number.isFinite(parsed)
            ? Math.max(0, Math.min(MAX_ASCENSION_LEVEL, parsed))
            : 0;
    }
    catch
    {
        return 0;
    }
};

export const writeAscensionLevel = (level: number): void =>
{
    const clamped = Math.max(0, Math.min(MAX_ASCENSION_LEVEL, Math.round(level)));

    try
    {
        localStorage.setItem(STORAGE_KEY, String(clamped));
    }
    catch
    {
        // ignore quota errors
    }
};

export const describeAscensionLevel = (level: number): string =>
{
    if (level <= 0)
    {
        return 'Base difficulty';
    }

    const bonus = Math.round(level * ASCENSION_HP_BONUS_PER_LEVEL * 100);

    return `Ascension ${level} — enemies +${bonus}% integrity`;
};
