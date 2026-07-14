import type { BoardLayout } from './boardLayout';

export interface EnemySlotLayout {
    x: number;
    y: number;
    size: number;
}

/** Positions enemy targets to the right of the board — stacked when there are several. */
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

    const size = Math.max(
        Math.round(layout.enemySize * 0.82),
        Math.round(layout.tileSize * 1.15),
    );
    const gap = Math.round(size * 0.22);
    const totalHeight = count * size + (count - 1) * gap;
    const anchorY = layout.enemyY + layout.enemySize / 2;
    const startY = Math.round(anchorY - totalHeight / 2);

    return Array.from({ length: count }, (_unused, index) => ({
        x: layout.enemyX + Math.round((layout.enemySize - size) / 2),
        y: startY + index * (size + gap),
        size,
    }));
};
