const STORAGE_KEY = 'signal-chain-ascension';
const UNLOCKED_STORAGE_KEY = 'signal-chain-ascension-unlocked';

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

const readStoredInt = (key: string, fallback: number): number =>
{
    try
    {
        const raw = localStorage.getItem(key);

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

const writeStoredInt = (key: string, value: number): void =>
{
    try
    {
        localStorage.setItem(key, String(value));
    }
    catch
    {
        // ignore quota errors
    }
};

/** Highest ascension tier the player may select (0 until the Warden is cleared). */
export const readMaxUnlockedAscension = (): number =>
    clampAscension(readStoredInt(UNLOCKED_STORAGE_KEY, 0));

/** After clearing the Warden at `clearedLevel`, unlock the next tier if applicable. */
export const recordAscensionClear = (clearedLevel: number): number =>
{
    const cleared = clampAscension(clearedLevel);
    const nextUnlock = Math.min(MAX_ASCENSION_LEVEL, cleared + 1);
    const current = readMaxUnlockedAscension();

    if (nextUnlock > current)
    {
        writeStoredInt(UNLOCKED_STORAGE_KEY, nextUnlock);
    }

    return readMaxUnlockedAscension();
};

export const clampSelectableAscension = (level: number): number =>
    Math.min(clampAscension(level), readMaxUnlockedAscension());

export const readAscensionLevel = (): number =>
    clampSelectableAscension(readStoredInt(STORAGE_KEY, 0));

export const writeAscensionLevel = (level: number): void =>
{
    writeStoredInt(STORAGE_KEY, clampSelectableAscension(level));
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

export const describeAscensionUnlockHint = (maxUnlocked: number): string =>
{
    if (maxUnlocked >= MAX_ASCENSION_LEVEL)
    {
        return 'All ascension tiers unlocked.';
    }

    if (maxUnlocked <= 0)
    {
        return 'Clear the Warden on base difficulty to unlock Ascension 1.';
    }

    return `Clear the Warden at Ascension ${maxUnlocked} to unlock Ascension ${maxUnlocked + 1}.`;
};
