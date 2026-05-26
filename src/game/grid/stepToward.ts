import type { Grid } from './Grid';
import type { GridPosition } from './types';
import { gridDistance } from './gridDistance';

const NEIGHBOR_OFFSETS: readonly GridPosition[] = [
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
    { col: 1, row: 1 },
    { col: -1, row: 1 },
    { col: 1, row: -1 },
    { col: -1, row: -1 },
];

export const stepToward = (
    from: GridPosition,
    to: GridPosition,
    grid: Grid,
    isWalkable?: (position: GridPosition) => boolean,
): GridPosition | null =>
{
    const currentDistance = gridDistance(from, to);

    let best: GridPosition | null = null;
    let bestDistance = currentDistance;

    for (const offset of NEIGHBOR_OFFSETS)
    {
        const candidate = {
            col: from.col + offset.col,
            row: from.row + offset.row,
        };

        if (!grid.isInBounds(candidate))
        {
            continue;
        }

        if (isWalkable && !isWalkable(candidate))
        {
            continue;
        }

        const distance = gridDistance(candidate, to);

        if (distance < bestDistance)
        {
            best = candidate;
            bestDistance = distance;
        }
    }

    return best;
};
