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

export type AvatarSilhouette =
    | 'diamond'
    | 'hexagon'
    | 'triangle'
    | 'circle'
    | 'octagon'
    | 'cross'
    | 'square'
    | 'pillar';

/** Temporary enemy avatar shapes — swap for character art later. */
export const drawEnemySilhouette = (
    graphics: Phaser.GameObjects.Graphics,
    silhouette: AvatarSilhouette,
    cx: number,
    cy: number,
    size: number,
    color: number,
    fillAlpha = 0.22,
    strokeAlpha = 0.9,
): void =>
{
    graphics.clear();

    const half = size / 2;

    graphics.fillStyle(color, fillAlpha);
    graphics.lineStyle(2, color, strokeAlpha);

    switch (silhouette)
    {
        case 'diamond':
            drawAvatarDiamond(graphics, cx, cy, size, color, fillAlpha, strokeAlpha);
            return;
        case 'circle':
            graphics.fillCircle(cx, cy, half);
            graphics.strokeCircle(cx, cy, half);
            return;
        case 'square':
        {
            const s = size * 0.72;

            graphics.fillRect(cx - s / 2, cy - s / 2, s, s);
            graphics.strokeRect(cx - s / 2, cy - s / 2, s, s);
            return;
        }
        case 'triangle':
            graphics.fillTriangle(cx, cy - half, cx + half, cy + half * 0.7, cx - half, cy + half * 0.7);
            graphics.strokeTriangle(cx, cy - half, cx + half, cy + half * 0.7, cx - half, cy + half * 0.7);
            return;
        case 'hexagon':
        {
            strokeFilledPolygon(graphics, regularPolygonPoints(cx, cy, half, 6, Math.PI / 6));
            return;
        }
        case 'octagon':
        {
            strokeFilledPolygon(graphics, regularPolygonPoints(cx, cy, half * 0.95, 8, Math.PI / 8));
            return;
        }
        case 'cross':
        {
            const arm = size * 0.22;
            const len = half * 0.95;

            graphics.fillRect(cx - arm / 2, cy - len, arm, len * 2);
            graphics.fillRect(cx - len, cy - arm / 2, len * 2, arm);
            graphics.strokeRect(cx - arm / 2, cy - len, arm, len * 2);
            graphics.strokeRect(cx - len, cy - arm / 2, len * 2, arm);
            return;
        }
        case 'pillar':
        {
            const width = size * 0.34;
            const height = size * 0.92;
            const top = cy - height / 2;
            const left = cx - width / 2;
            const cap = width * 1.35;

            graphics.fillRect(cx - cap / 2, top, cap, height * 0.14);
            graphics.fillRect(left, top + height * 0.12, width, height * 0.76);
            graphics.fillRect(cx - cap / 2, top + height * 0.86, cap, height * 0.14);
            graphics.strokeRect(cx - cap / 2, top, cap, height * 0.14);
            graphics.strokeRect(left, top + height * 0.12, width, height * 0.76);
            graphics.strokeRect(cx - cap / 2, top + height * 0.86, cap, height * 0.14);
            return;
        }
    }
};

interface PolyPoint { x: number; y: number }

const strokeFilledPolygon = (
    graphics: Phaser.GameObjects.Graphics,
    points: readonly PolyPoint[],
): void =>
{
    if (points.length === 0)
    {
        return;
    }

    graphics.beginPath();
    graphics.moveTo(points[0]!.x, points[0]!.y);

    for (let i = 1; i < points.length; i++)
    {
        graphics.lineTo(points[i]!.x, points[i]!.y);
    }

    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
};

const regularPolygonPoints = (
    cx: number,
    cy: number,
    radius: number,
    sides: number,
    rotation: number,
): PolyPoint[] =>
{
    const points: PolyPoint[] = [];

    for (let i = 0; i < sides; i++)
    {
        const angle = rotation + (i * Math.PI * 2) / sides;

        points.push({
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
        });
    }

    return points;
};
