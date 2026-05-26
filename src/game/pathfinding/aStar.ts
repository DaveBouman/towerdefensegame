import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
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

const octileHeuristic = (a: GridPosition, b: GridPosition): number =>
{
    const dx = Math.abs(a.col - b.col);
    const dy = Math.abs(a.row - b.row);

    return DIAGONAL_COST * Math.min(dx, dy) + Math.abs(dx - dy);
};

const isWalkable = (
    grid: Grid,
    tile: GridPosition,
    blocked: ReadonlySet<string>,
): boolean =>
    grid.isInBounds(tile) && !blocked.has(tileKey(tile));

const nearestWalkable = (
    grid: Grid,
    target: GridPosition,
    blocked: ReadonlySet<string>,
): GridPosition | null =>
{
    if (isWalkable(grid, target, blocked))
    {
        return target;
    }

    const visited = new Set<string>([ tileKey(target) ]);
    const queue: GridPosition[] = [ target ];

    while (queue.length > 0)
    {
        const current = queue.shift()!;

        for (const offset of NEIGHBOR_OFFSETS)
        {
            const next = {
                col: current.col + offset.col,
                row: current.row + offset.row,
            };
            const key = tileKey(next);

            if (visited.has(key))
            {
                continue;
            }

            visited.add(key);

            if (isWalkable(grid, next, blocked))
            {
                return next;
            }

            if (grid.isInBounds(next))
            {
                queue.push(next);
            }
        }
    }

    return null;
};

interface SearchNode {
    tile: GridPosition;
    g: number;
    f: number;
}

export const findPath = (
    grid: Grid,
    start: GridPosition,
    goal: GridPosition,
    blocked: ReadonlySet<string>,
): GridPosition[] | null =>
{
    const resolvedGoal = nearestWalkable(grid, goal, blocked);

    if (!resolvedGoal || !isWalkable(grid, start, blocked))
    {
        return null;
    }

    const startKey = tileKey(start);
    const goalKey = tileKey(resolvedGoal);

    if (startKey === goalKey)
    {
        return [];
    }

    const open = new Map<string, SearchNode>();
    const parents = new Map<string, string | null>();
    const closed = new Set<string>();

    open.set(startKey, {
        tile: start,
        g: 0,
        f: octileHeuristic(start, resolvedGoal),
    });
    parents.set(startKey, null);

    while (open.size > 0)
    {
        let currentKey = '';
        let current: SearchNode | null = null;

        for (const [ key, node ] of open)
        {
            if (!current || node.f < current.f)
            {
                current = node;
                currentKey = key;
            }
        }

        if (!current)
        {
            break;
        }

        if (currentKey === goalKey)
        {
            const path: GridPosition[] = [];
            let walkKey: string | null = goalKey;

            while (walkKey && walkKey !== startKey)
            {
                path.unshift(parseTileKey(walkKey));
                walkKey = parents.get(walkKey) ?? null;
            }

            return path;
        }

        open.delete(currentKey);
        closed.add(currentKey);

        for (const offset of NEIGHBOR_OFFSETS)
        {
            const nextTile = {
                col: current.tile.col + offset.col,
                row: current.tile.row + offset.row,
            };
            const nextKey = tileKey(nextTile);

            if (closed.has(nextKey) || !isWalkable(grid, nextTile, blocked))
            {
                continue;
            }

            const isDiagonal = offset.col !== 0 && offset.row !== 0;

            if (isDiagonal)
            {
                const horizontal = {
                    col: current.tile.col + offset.col,
                    row: current.tile.row,
                };
                const vertical = {
                    col: current.tile.col,
                    row: current.tile.row + offset.row,
                };

                if (!isWalkable(grid, horizontal, blocked) || !isWalkable(grid, vertical, blocked))
                {
                    continue;
                }
            }

            const stepCost = isDiagonal ? DIAGONAL_COST : CARDINAL_COST;
            const g = current.g + stepCost;
            const existing = open.get(nextKey);

            if (existing && g >= existing.g)
            {
                continue;
            }

            open.set(nextKey, {
                tile: nextTile,
                g,
                f: g + octileHeuristic(nextTile, resolvedGoal),
            });
            parents.set(nextKey, currentKey);
        }
    }

    return null;
};
