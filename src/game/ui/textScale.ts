/** Persistent UI text size: scales CSS `--text-scale` on `:root`. */

export type TextScaleSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'td-game-text-scale';

export const TEXT_SCALE_SIZES: readonly TextScaleSize[] = [ 'small', 'medium', 'large' ];

/** Multipliers applied to UI font sizes via `calc(... * var(--text-scale))`. */
export const TEXT_SCALE_VALUES: Record<TextScaleSize, number> = {
    small: 1,
    medium: 1.15,
    large: 1.3,
};

export const DEFAULT_TEXT_SCALE: TextScaleSize = 'medium';

const isTextScaleSize = (value: string | null): value is TextScaleSize =>
    value === 'small' || value === 'medium' || value === 'large';

export const readTextScale = (): TextScaleSize =>
{
    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        return isTextScaleSize(raw) ? raw : DEFAULT_TEXT_SCALE;
    }
    catch
    {
        return DEFAULT_TEXT_SCALE;
    }
};

export const writeTextScale = (size: TextScaleSize): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, size);
    }
    catch
    {
        /* ignore */
    }
};

export const applyTextScale = (size: TextScaleSize = readTextScale()): void =>
{
    if (typeof document === 'undefined')
    {
        return;
    }

    document.documentElement.style.setProperty(
        '--text-scale',
        String(TEXT_SCALE_VALUES[size]),
    );
};

export const setTextScale = (size: TextScaleSize): void =>
{
    writeTextScale(size);
    applyTextScale(size);
};
