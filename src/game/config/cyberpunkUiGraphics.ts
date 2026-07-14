import type Phaser from 'phaser';

export interface CornerBracketOptions {
    arm?: number;
    inset?: number;
    lineWidth?: number;
    alpha?: number;
}

/** Draws four cyberpunk corner brackets inside a graphics object. */
export const drawCornerBrackets = (
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    options: CornerBracketOptions = {},
): void =>
{
    const arm = options.arm ?? Math.min(12, Math.round(Math.min(width, height) * 0.18));
    const inset = options.inset ?? 0;
    const lineWidth = options.lineWidth ?? 2;
    const alpha = options.alpha ?? 1;
    const left = x + inset;
    const top = y + inset;
    const right = x + width - inset;
    const bottom = y + height - inset;

    graphics.clear();
    graphics.lineStyle(lineWidth, color, alpha);

    const corner = (hx: number, hy: number, vx: number, vy: number): void =>
    {
        graphics.beginPath();
        graphics.moveTo(hx, hy);
        graphics.lineTo(vx, vy);
        graphics.strokePath();
    };

    corner(left, top + arm, left, top);
    corner(left, top, left + arm, top);
    corner(right - arm, top, right, top);
    corner(right, top, right, top + arm);
    corner(right, bottom - arm, right, bottom);
    corner(right, bottom, right - arm, bottom);
    corner(left + arm, bottom, left, bottom);
    corner(left, bottom, left, bottom - arm);
};

/** Filled panel with neon border — used for board backdrop and entity frames. */
export const drawNeonPanel = (
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    border: number,
    fillAlpha = 0.92,
    borderAlpha = 0.55,
): void =>
{
    graphics.clear();
    graphics.fillStyle(fill, fillAlpha);
    graphics.fillRect(x, y, width, height);
    graphics.lineStyle(2, border, borderAlpha);
    graphics.strokeRect(x + 1, y + 1, width - 2, height - 2);
};

/** Diamond avatar glyph for player/enemy silhouettes. */
export const drawAvatarDiamond = (
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number,
    color: number,
    fillAlpha = 0.22,
    strokeAlpha = 0.9,
): void =>
{
    const half = size / 2;

    graphics.fillStyle(color, fillAlpha);
    graphics.fillTriangle(cx, cy - half, cx + half, cy, cx, cy + half);
    graphics.fillTriangle(cx, cy - half, cx - half, cy, cx, cy + half);
    graphics.lineStyle(2, color, strokeAlpha);
    graphics.strokeTriangle(cx, cy - half, cx + half, cy, cx, cy + half);
    graphics.strokeTriangle(cx, cy - half, cx - half, cy, cx, cy + half);
};
