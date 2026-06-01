import type { CombatEntity } from '../combat/combatRange';
import { isWithinAttackRange } from '../combat/combatRange';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import { tileCenterWorld } from '../grid/worldPosition';
import { findPath } from './aStar';
import { tileKey } from './tileKey';

const angleFrom = (origin: GridPosition, tile: GridPosition): number =>
    Math.atan2(tile.row - origin.row, tile.col - origin.col);

/** Tiles where the attacker can stand and hit the target (excluding the target's tile). */
export const collectAttackRingTiles = (
    grid: Grid,
    target: CombatEntity,
    attackerHalfWidth: number,
    attackerHalfHeight: number,
    rangePx: number,
    blocked: ReadonlySet<string>,
): GridPosition[] =>
{
    const targetTile = grid.toGrid(target.position.x, target.position.y)
        ?? grid.layout.playfieldAnchorTile(target.position);

    if (!targetTile)
    {
        return [];
    }

    const tileSize = grid.config.tileSize;
    const searchRadius = Math.ceil(rangePx / tileSize) + 2;
    const candidates: GridPosition[] = [];

    for (let dc = -searchRadius; dc <= searchRadius; dc++)
    {
        for (let dr = -searchRadius; dr <= searchRadius; dr++)
        {
            const tile = {
                col: targetTile.col + dc,
                row: targetTile.row + dr,
            };

            if (!grid.isInBounds(tile))
            {
                continue;
            }

            if (tile.col === targetTile.col && tile.row === targetTile.row)
            {
                continue;
            }

            if (blocked.has(tileKey(tile)))
            {
                continue;
            }

            const standPosition = tileCenterWorld(grid.config, tile);
            const attackerAtTile: CombatEntity = {
                position: standPosition,
                bodyHalfWidth: attackerHalfWidth,
                bodyHalfHeight: attackerHalfHeight,
            };

            if (!isWithinAttackRange(attackerAtTile, target, rangePx))
            {
                continue;
            }

            candidates.push(tile);
        }
    }

    return candidates;
};

const rotateBySlot = (
    candidates: readonly GridPosition[],
    origin: GridPosition,
    slotIndex: number,
): GridPosition[] =>
{
    if (candidates.length === 0)
    {
        return [];
    }

    const sorted = [ ...candidates ].sort((a, b) => angleFrom(origin, a) - angleFrom(origin, b));
    const offset = ((slotIndex % sorted.length) + sorted.length) % sorted.length;

    return [ ...sorted.slice(offset), ...sorted.slice(0, offset) ];
};

/**
 * Picks a walkable tile on the target's attack ring so units spread around it
 * instead of stacking on one path to the center.
 */
export const pickSurroundGoalTile = (
    grid: Grid,
    start: GridPosition,
    target: CombatEntity,
    attackerHalfWidth: number,
    attackerHalfHeight: number,
    rangePx: number,
    blocked: ReadonlySet<string>,
    reservedGoals: ReadonlySet<string>,
    slotIndex: number,
): GridPosition | null =>
{
    const targetTile = grid.toGrid(target.position.x, target.position.y)
        ?? grid.layout.playfieldAnchorTile(target.position);

    if (!targetTile)
    {
        return null;
    }

    const ringTiles = collectAttackRingTiles(
        grid,
        target,
        attackerHalfWidth,
        attackerHalfHeight,
        rangePx,
        blocked,
    );

    const ordered = rotateBySlot(ringTiles, targetTile, slotIndex);

    for (const candidate of ordered)
    {
        if (reservedGoals.has(tileKey(candidate)))
        {
            continue;
        }

        if (findPath(grid, start, candidate, blocked) !== null)
        {
            return candidate;
        }
    }

    return findPath(grid, start, targetTile, blocked) !== null ? targetTile : null;
};
