import type Phaser from 'phaser';

/** Shared UI font — loaded in index.html (DM Sans). */
export const UI_FONT_FAMILY = 'DM Sans, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

export const TEXT_RESOLUTION = typeof window !== 'undefined'
    ? Math.min(window.devicePixelRatio || 1, 2)
    : 1;

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
    const bold = options.bold ?? false;
    const stroke = options.stroke ?? true;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${fontSize}px`,
        color,
        fontStyle: bold ? 'bold' : 'normal',
        resolution: TEXT_RESOLUTION,
    };

    if (stroke)
    {
        style.stroke = options.strokeColor ?? '#080812';
        style.strokeThickness = Math.max(2, Math.round(fontSize * 0.14));
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

/** Ensures DM Sans is ready before Phaser draws canvas text. */
export const loadUIFont = async (): Promise<void> =>
{
    if (typeof document === 'undefined')
    {
        return;
    }

    await Promise.all([
        document.fonts.load('400 16px "DM Sans"'),
        document.fonts.load('600 16px "DM Sans"'),
        document.fonts.load('700 16px "DM Sans"'),
    ]);
    await document.fonts.ready;
};
