import type { Grid } from '../grid/Grid';
import type { CollisionSystem } from '../systems/CollisionSystem';
import { tileKey } from './tileKey';

export const buildBlockedTiles = (
    grid: Grid,
    collision: CollisionSystem,
    excludeId: string,
): Set<string> =>
{
    const blocked = new Set<string>();

    for (const id of collision.getBodyIds())
    {
        if (id === excludeId)
        {
            continue;
        }

        const center = collision.getCenter(id);

        if (!center)
        {
            continue;
        }

        const tile = grid.toGrid(center.x, center.y);

        if (tile)
        {
            blocked.add(tileKey(tile));
        }
    }

    return blocked;
};
