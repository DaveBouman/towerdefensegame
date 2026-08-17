/** Persistent cursor accent color — triangle pointer border (blue / purple / green). */

export type CursorColor = 'blue' | 'purple' | 'green';

export type GameCursorUrls = {
    default: string;
    pointer: string;
    grab: string;
    grabbing: string;
    text: string;
    notAllowed: string;
};

const STORAGE_KEY = 'signal-chain-cursor-color';

export const CURSOR_COLORS: readonly CursorColor[] = [ 'blue', 'purple', 'green' ];

export const DEFAULT_CURSOR_COLOR: CursorColor = 'blue';

export const CURSOR_COLOR_LABELS: Record<CursorColor, string> = {
    blue: 'Blue',
    purple: 'Purple',
    green: 'Green',
};

const isCursorColor = (value: string | null): value is CursorColor =>
    value === 'blue' || value === 'purple' || value === 'green';

export const readCursorColor = (): CursorColor =>
{
    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        return isCursorColor(raw) ? raw : DEFAULT_CURSOR_COLOR;
    }
    catch
    {
        return DEFAULT_CURSOR_COLOR;
    }
};

export const writeCursorColor = (color: CursorColor): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, color);
    }
    catch
    {
        /* ignore */
    }
};

export const buildCursorUrls = (color: CursorColor): GameCursorUrls =>
{
    const base = `./assets/ui/cursors/${color}`;

    return {
        default: `url('${base}/default.svg') 1 1, auto`,
        pointer: `url('${base}/default.svg') 1 1, pointer`,
        grab: `url('${base}/default.svg') 1 1, grab`,
        grabbing: `url('${base}/grabbing.svg') 1 1, grabbing`,
        text: `url('${base}/text.svg') 12 12, text`,
        notAllowed: `url('./assets/ui/cursors/not-allowed.svg') 1 1, not-allowed`,
    };
};

type CursorListener = (urls: GameCursorUrls) => void;

const listeners = new Set<CursorListener>();

export const subscribeGameCursors = (listener: CursorListener): (() => void) =>
{
    listeners.add(listener);
    listener(buildCursorUrls(readCursorColor()));

    return () =>
    {
        listeners.delete(listener);
    };
};

const notifyCursorListeners = (urls: GameCursorUrls): void =>
{
    for (const listener of listeners)
    {
        listener(urls);
    }
};

export const applyCursorColor = (color: CursorColor = readCursorColor()): void =>
{
    if (typeof document === 'undefined')
    {
        return;
    }

    const urls = buildCursorUrls(color);

    document.documentElement.style.setProperty('--cursor-default', urls.default);
    document.documentElement.style.setProperty('--cursor-pointer', urls.pointer);
    document.documentElement.style.setProperty('--cursor-grab', urls.grab);
    document.documentElement.style.setProperty('--cursor-grabbing', urls.grabbing);
    document.documentElement.style.setProperty('--cursor-text', urls.text);
    document.documentElement.style.setProperty('--cursor-not-allowed', urls.notAllowed);
    notifyCursorListeners(urls);
};

export const setCursorColor = (color: CursorColor): void =>
{
    writeCursorColor(color);
    applyCursorColor(color);
};
