import type Phaser from 'phaser';

/** Shared UI font — loaded in index.html (Rajdhani + Orbitron). */
export const UI_FONT_FAMILY = 'Rajdhani, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

export const TEXT_RESOLUTION = typeof window !== 'undefined'
    ? Math.min(window.devicePixelRatio || 1, 2)
    : 1;

/** Multiplier applied to all Phaser canvas UI text sizes. */
export const UI_FONT_SCALE = 1.15;

export type GameTextOptions = {
    bold?: boolean;
    stroke?: boolean;
    strokeColor?: string;
    backgroundColor?: string;
    padding?: Phaser.Types.GameObjects.Text.TextPadding;
};

/** Phaser text style tuned for crisp, readable labels on the game canvas. */
export const uiTextStyle = (
    fontSize: number,
    color: string,
    options: GameTextOptions = {},
): Phaser.Types.GameObjects.Text.TextStyle =>
{
    const scaledSize = Math.round(fontSize * UI_FONT_SCALE);
    const bold = options.bold ?? false;
    const stroke = options.stroke ?? true;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${scaledSize}px`,
        color,
        fontStyle: bold ? 'bold' : 'normal',
        resolution: TEXT_RESOLUTION,
    };

    if (stroke)
    {
        style.stroke = options.strokeColor ?? '#080812';
        style.strokeThickness = Math.max(2, Math.round(scaledSize * 0.14));
    }

    if (options.backgroundColor)
    {
        style.backgroundColor = options.backgroundColor;
    }

    if (options.padding)
    {
        style.padding = options.padding;
    }

    return style;
};

/** Ensures UI fonts are ready before Phaser draws canvas text. */
export const loadUIFont = async (): Promise<void> =>
{
    if (typeof document === 'undefined')
    {
        return;
    }

    await Promise.all([
        document.fonts.load('500 16px "Rajdhani"'),
        document.fonts.load('600 16px "Rajdhani"'),
        document.fonts.load('700 16px "Rajdhani"'),
        document.fonts.load('700 16px "Orbitron"'),
    ]);
    await document.fonts.ready;
};
