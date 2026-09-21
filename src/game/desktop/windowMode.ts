import { getDesktopApi, isDesktopShell } from './desktopBridge';

export type WindowMode = 'windowed' | 'borderless' | 'fullscreen';

const STORAGE_KEY = 'signal-chain-window-mode';

export const WINDOW_MODES: readonly WindowMode[] = [
    'windowed',
    'borderless',
    'fullscreen',
];

export const WINDOW_MODE_LABELS: Record<WindowMode, string> = {
    windowed: 'Windowed',
    borderless: 'Borderless fullscreen',
    fullscreen: 'Fullscreen',
};

export const isWindowMode = (value: string): value is WindowMode =>
    WINDOW_MODES.includes(value as WindowMode);

export const readStoredWindowMode = (): WindowMode =>
{
    if (!isDesktopShell())
    {
        return 'windowed';
    }

    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw && isWindowMode(raw))
        {
            return raw;
        }
    }
    catch
    {
        /* ignore */
    }

    return 'windowed';
};

export const writeStoredWindowMode = (mode: WindowMode): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, mode);
    }
    catch
    {
        /* ignore */
    }
};

export const readGameWindowMode = async (): Promise<WindowMode> =>
{
    const desktop = getDesktopApi();

    if (desktop?.getWindowMode)
    {
        const mode = await desktop.getWindowMode();

        if (typeof mode === 'string' && isWindowMode(mode))
        {
            return mode;
        }
    }

    return readStoredWindowMode();
};

export const setGameWindowMode = async (mode: WindowMode): Promise<WindowMode> =>
{
    const desktop = getDesktopApi();

    if (desktop?.setWindowMode)
    {
        const applied = await desktop.setWindowMode(mode);
        const resolved = typeof applied === 'string' && isWindowMode(applied)
            ? applied
            : mode;

        writeStoredWindowMode(resolved);

        return resolved;
    }

    writeStoredWindowMode(mode);

    return mode;
};

export const applyStoredWindowMode = async (): Promise<WindowMode> =>
{
    const stored = readStoredWindowMode();

    return setGameWindowMode(stored);
};
