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
const CURSOR_SIZE = 32;

export const CURSOR_COLORS: readonly CursorColor[] = [ 'blue', 'purple', 'green' ];

export const DEFAULT_CURSOR_COLOR: CursorColor = 'blue';

export const CURSOR_COLOR_LABELS: Record<CursorColor, string> = {
    blue: 'Blue',
    purple: 'Purple',
    green: 'Green',
};

const ACCENT: Record<CursorColor, string> = {
    blue: '#00e8ff',
    purple: '#c44dff',
    green: '#00ff9d',
};

const INNER = '#0c0812';
const NOT_ALLOWED = '#ff3b6b';

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

const getDrawContext = (): CanvasRenderingContext2D | null =>
{
    try
    {
        if (typeof document === 'undefined')
        {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = CURSOR_SIZE;
        canvas.height = CURSOR_SIZE;

        return canvas.getContext('2d');
    }
    catch
    {
        return null;
    }
};

const toCursorValue = (
    context: CanvasRenderingContext2D,
    hotspotX: number,
    hotspotY: number,
    fallback: string,
): string =>
    `url("${context.canvas.toDataURL('image/png')}") ${hotspotX} ${hotspotY}, ${fallback}`;

const drawTriangle = (
    context: CanvasRenderingContext2D,
    fill: string,
    inner: string | null,
): void =>
{
    context.clearRect(0, 0, CURSOR_SIZE, CURSOR_SIZE);
    context.beginPath();
    context.moveTo(1, 1);
    context.lineTo(1, 26);
    context.lineTo(20, 18);
    context.closePath();
    context.fillStyle = fill;
    context.fill();

    if (!inner)
    {
        return;
    }

    context.beginPath();
    context.moveTo(4, 5);
    context.lineTo(4, 22);
    context.lineTo(16, 17);
    context.closePath();
    context.fillStyle = inner;
    context.fill();
};

const fileCursorFallback = (color: CursorColor): GameCursorUrls =>
{
    const base = `./assets/ui/cursors/${color}`;

    return {
        default: `url('${base}/default.svg') 1 1, auto`,
        pointer: `url('${base}/default.svg') 1 1, auto`,
        grab: `url('${base}/default.svg') 1 1, auto`,
        grabbing: `url('${base}/grabbing.svg') 1 1, auto`,
        text: `url('${base}/text.svg') 12 12, text`,
        notAllowed: `url('./assets/ui/cursors/not-allowed.svg') 1 1, not-allowed`,
    };
};

/** PNG data-URIs so Chromium/macOS actually shows a custom cursor (SVG urls often fail). */
export const buildCursorUrls = (color: CursorColor): GameCursorUrls =>
{
    const context = getDrawContext();

    if (!context)
    {
        return fileCursorFallback(color);
    }

    const accent = ACCENT[color];

    drawTriangle(context, accent, INNER);
    const triangle = toCursorValue(context, 1, 1, 'auto');

    drawTriangle(context, accent, null);
    const grabbing = toCursorValue(context, 1, 1, 'auto');

    context.clearRect(0, 0, CURSOR_SIZE, CURSOR_SIZE);
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.lineCap = 'square';
    context.beginPath();
    context.moveTo(11, 4);
    context.lineTo(21, 4);
    context.moveTo(16, 4);
    context.lineTo(16, 28);
    context.moveTo(11, 28);
    context.lineTo(21, 28);
    context.stroke();
    const text = toCursorValue(context, 16, 16, 'text');

    drawTriangle(context, NOT_ALLOWED, INNER);
    context.strokeStyle = NOT_ALLOWED;
    context.lineWidth = 2;
    context.lineCap = 'square';
    context.beginPath();
    context.moveTo(6, 8);
    context.lineTo(18, 20);
    context.stroke();
    const notAllowed = toCursorValue(context, 1, 1, 'not-allowed');

    return {
        default: triangle,
        pointer: triangle,
        grab: triangle,
        grabbing,
        text,
        notAllowed,
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
    document.documentElement.style.cursor = urls.default;

    if (document.body)
    {
        document.body.style.cursor = urls.default;
    }

    notifyCursorListeners(urls);
};

export const setCursorColor = (color: CursorColor): void =>
{
    writeCursorColor(color);
    applyCursorColor(color);
};
