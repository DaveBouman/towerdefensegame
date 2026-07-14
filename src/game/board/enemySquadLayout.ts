import type { BoardLayout } from './boardLayout';

export interface EnemySlotLayout {
    x: number;
    y: number;
    size: number;
}

/** Max enemies shown in a horizontal row beside the board (used for layout width). */
export const MAX_ENEMY_COLUMN_SLOTS = 3;

export const getMultiEnemySlotSize = (layout: BoardLayout): number =>
    Math.max(
        Math.round(layout.enemySize * 0.82),
        Math.round(layout.tileSize * 1.15),
    );

export const getMultiEnemySlotGap = (size: number): number =>
    Math.round(size * 0.22);

/** Horizontal space reserved to the right of the board for a row of enemy targets. */
export const computeEnemyColumnWidth = (
    enemySize: number,
    tileSize: number,
    slotCount = MAX_ENEMY_COLUMN_SLOTS,
): number =>
{
    if (slotCount <= 1)
    {
        return enemySize;
    }

    const size = Math.max(
        Math.round(enemySize * 0.82),
        Math.round(tileSize * 1.15),
    );
    const gap = getMultiEnemySlotGap(size);

    return slotCount * size + (slotCount - 1) * gap;
};

/** Positions enemy targets in a row to the right of the board, left → right. */
export const computeEnemySlots = (
    layout: BoardLayout,
    count: number,
): EnemySlotLayout[] =>
{
    if (count <= 0)
    {
        return [];
    }

    if (count === 1)
    {
        return [ {
            x: layout.enemyX,
            y: layout.enemyY,
            size: layout.enemySize,
        } ];
    }

    const size = getMultiEnemySlotSize(layout);
    const gap = getMultiEnemySlotGap(size);
    const y = layout.enemyY + Math.round((layout.enemySize - size) / 2);

    return Array.from({ length: count }, (_unused, index) => ({
        x: layout.enemyX + index * (size + gap),
        y,
        size,
    }));
};
