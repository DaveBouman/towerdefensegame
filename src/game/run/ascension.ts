const UNLOCKED_STORAGE_KEY = 'signal-chain-ascension';

export const MAX_ASCENSION_LEVEL = 10;

/** Extra enemy max HP per ascension level (10% each). */
export const ASCENSION_HP_BONUS_PER_LEVEL = 0.1;

export const getAscensionEnemyHealthMultiplier = (level: number): number =>
{
    const clamped = Math.max(0, Math.min(MAX_ASCENSION_LEVEL, Math.round(level)));

    return 1 + clamped * ASCENSION_HP_BONUS_PER_LEVEL;
};

const clampAscension = (level: number): number =>
    Math.max(0, Math.min(MAX_ASCENSION_LEVEL, Math.round(level)));

const readStoredInt = (fallback: number): number =>
{
    try
    {
        const raw = localStorage.getItem(UNLOCKED_STORAGE_KEY);

        if (raw === null)
        {
            return fallback;
        }

        const parsed = Number.parseInt(raw, 10);

        return Number.isFinite(parsed) ? parsed : fallback;
    }
    catch
    {
        return fallback;
    }
};

const writeStoredInt = (value: number): void =>
{
    try
    {
        localStorage.setItem(UNLOCKED_STORAGE_KEY, String(value));
    }
    catch
    {
        // ignore quota errors
    }
};

/** Current ascension counter — run difficulty tier (0 until first Warden clear). */
export const readRunAscensionLevel = (): number =>
    clampAscension(readStoredInt(0));

/**
 * True after the player has beaten the Warden at least once.
 * Until then, Ascension UI stays hidden (menu, map, run-end stats).
 */
export const hasUnlockedAscension = (): boolean =>
    readRunAscensionLevel() > 0;

/** @deprecated Use readRunAscensionLevel. */
export const readMaxUnlockedAscension = readRunAscensionLevel;

/** @deprecated Use readRunAscensionLevel. */
export const readAscensionLevel = readRunAscensionLevel;

/**
 * After clearing the Warden at `clearedLevel`, bump the counter for the next run.
 * Returns the new ascension level (unchanged if already at max).
 */
export const recordAscensionClear = (clearedLevel: number): number =>
{
    const cleared = clampAscension(clearedLevel);
    const nextLevel = Math.min(MAX_ASCENSION_LEVEL, cleared + 1);
    const current = readRunAscensionLevel();

    if (nextLevel > current)
    {
        writeStoredInt(nextLevel);
    }

    return readRunAscensionLevel();
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

/** Shown on the Warden victory screen when a new ascension tier unlocks. */
export const formatAscensionUnlockMessage = (unlockedLevel: number): string =>
{
    if (unlockedLevel <= 0)
    {
        return '';
    }

    const bonus = Math.round(unlockedLevel * ASCENSION_HP_BONUS_PER_LEVEL * 100);

    return `Ascension ${unlockedLevel} unlocked — enemies +${bonus}% integrity on your next run.`;
};
