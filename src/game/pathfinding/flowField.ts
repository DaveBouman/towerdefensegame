import type { Grid } from '../grid/Grid';
import type { GridPosition, WorldPosition } from '../grid/types';
import { tileCenterWorld } from '../grid/worldPosition';
import { parseTileKey, tileKey } from './tileKey';

const CARDINAL_COST = 1;
const DIAGONAL_COST = Math.SQRT2;

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

const isWalkable = (
    grid: Grid,
    tile: GridPosition,
    blocked: ReadonlySet<string>,
): boolean => grid.isInBounds(tile) && !blocked.has(tileKey(tile));

const normalize = (x: number, y: number): WorldPosition | null =>
{
    const length = Math.hypot(x, y);

    if (length < 0.001)
    {
        return null;
    }

    return { x: x / length, y: y / length };
};

/**
 * Integration flow field (SC2-style): multi-source BFS from goal tiles,
 * each cell stores a unit vector downhill toward the nearest goal.
 */
export class FlowField
{
    private readonly directionByTile = new Map<string, WorldPosition>();

    private constructor (directionByTile: Map<string, WorldPosition>)
    {
        this.directionByTile = directionByTile;
    }

    getDirectionAt (tile: GridPosition): WorldPosition | null
    {
        return this.directionByTile.get(tileKey(tile)) ?? null;
    }

    getWorldFlowAt (position: WorldPosition, grid: Grid): WorldPosition | null
    {
        const tile = grid.toGrid(position.x, position.y);

        if (!tile)
        {
            return null;
        }

        const base = this.getDirectionAt(tile);

        if (base)
        {
            return { ...base };
        }

        const { cols, rows } = grid.config;
        let blendX = 0;
        let blendY = 0;
        let samples = 0;

        for (let dc = -1; dc <= 1; dc++)
        {
            for (let dr = -1; dr <= 1; dr++)
            {
                const sample = { col: tile.col + dc, row: tile.row + dr };

                if (!grid.isInBounds(sample))
                {
                    continue;
                }

                const dir = this.getDirectionAt(sample);

                if (!dir)
                {
                    continue;
                }

                blendX += dir.x;
                blendY += dir.y;
                samples++;
            }
        }

        if (samples === 0)
        {
            return null;
        }

        return normalize(blendX / samples, blendY / samples);
    }

    static build (
        grid: Grid,
        goalTiles: readonly GridPosition[],
        blocked: ReadonlySet<string>,
    ): FlowField
    {
        const cost = new Map<string, number>();
        const queue: GridPosition[] = [];

        for (const goal of goalTiles)
        {
            if (!isWalkable(grid, goal, blocked))
            {
                continue;
            }

            const key = tileKey(goal);

            if (cost.has(key))
            {
                continue;
            }

            cost.set(key, 0);
            queue.push(goal);
        }

        let head = 0;

        while (head < queue.length)
        {
            const current = queue[head++]!;
            const currentKey = tileKey(current);
            const currentCost = cost.get(currentKey)!;

            for (const offset of NEIGHBOR_OFFSETS)
            {
                const next = {
                    col: current.col + offset.col,
                    row: current.row + offset.row,
                };
                const nextKey = tileKey(next);

                if (!isWalkable(grid, next, blocked) || cost.has(nextKey))
                {
                    continue;
                }

                const isDiagonal = offset.col !== 0 && offset.row !== 0;

                if (isDiagonal)
                {
                    const horizontal = {
                        col: current.col + offset.col,
                        row: current.row,
                    };
                    const vertical = {
                        col: current.col,
                        row: current.row + offset.row,
                    };

                    if (!isWalkable(grid, horizontal, blocked) || !isWalkable(grid, vertical, blocked))
                    {
                        continue;
                    }
                }

                const stepCost = isDiagonal ? DIAGONAL_COST : CARDINAL_COST;

                cost.set(nextKey, currentCost + stepCost);
                queue.push(next);
            }
        }

        const directionByTile = new Map<string, WorldPosition>();

        for (const key of cost.keys())
        {
            const tile = parseTileKey(key);
            const tileCost = cost.get(key)!;
            let bestTile: GridPosition | null = null;
            let bestCost = tileCost;

            for (const offset of NEIGHBOR_OFFSETS)
            {
                const neighbor = {
                    col: tile.col + offset.col,
                    row: tile.row + offset.row,
                };
                const neighborKey = tileKey(neighbor);
                const neighborCost = cost.get(neighborKey);

                if (neighborCost === undefined || neighborCost >= bestCost)
                {
                    continue;
                }

                bestCost = neighborCost;
                bestTile = neighbor;
            }

            if (!bestTile)
            {
                continue;
            }

            const from = tileCenterWorld(grid.config, tile);
            const to = tileCenterWorld(grid.config, bestTile);
            const direction = normalize(to.x - from.x, to.y - from.y);

            if (direction)
            {
                directionByTile.set(key, direction);
            }
        }

        return new FlowField(directionByTile);
    }
}
