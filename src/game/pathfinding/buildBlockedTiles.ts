import { boxFromCenter, boxesOverlap } from '../collision/aabb';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import type { CollisionSystem } from '../systems/CollisionSystem';
import { tileKey } from './tileKey';

const tileWorldBox = (grid: Grid, { col, row }: GridPosition) =>
{
    const half = grid.config.tileSize / 2;

    return boxFromCenter(grid.layout.gridTileCenter({ col, row }), half, half);
};

const addTilesOverlappingBody = (
    grid: Grid,
    blocked: Set<string>,
    center: { x: number; y: number },
    halfWidth: number,
    halfHeight: number,
): void =>
{
    const body = boxFromCenter(center, halfWidth, halfHeight);
    const { tileSize, cols, rows } = grid.config;
    const minCol = Math.max(0, Math.floor(body.left / tileSize));
    const maxCol = Math.min(cols - 1, Math.floor(body.right / tileSize));
    const localTop = body.top - grid.layout.playfieldOffsetY;
    const localBottom = body.bottom - grid.layout.playfieldOffsetY;
    const minRow = Math.max(0, Math.floor(localTop / tileSize));
    const maxRow = Math.min(rows - 1, Math.floor(localBottom / tileSize));

    for (let col = minCol; col <= maxCol; col++)
    {
        for (let row = minRow; row <= maxRow; row++)
        {
            const tile = { col, row };

            if (boxesOverlap(body, tileWorldBox(grid, tile)))
            {
                blocked.add(tileKey(tile));
            }
        }
    }
};

export const buildBlockedTiles = (
    grid: Grid,
    collision: CollisionSystem,
    excludeId: string,
): Set<string> =>
{
    const blocked = new Set<string>();

    collision.forEachBody(excludeId, (center, halfWidth, halfHeight) =>
    {
        addTilesOverlappingBody(grid, blocked, center, halfWidth, halfHeight);
    });

    return blocked;
};
