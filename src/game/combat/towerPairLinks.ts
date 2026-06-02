import { RACE_BONUS_CONFIG, type RaceBonusConfig } from '../config/raceBonusCatalog';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';

type SpecificPairRule = RaceBonusConfig['specificPairBonuses'][number];

export interface TowerPairLink {
    towerIdA: string;
    towerIdB: string;
}

export interface DirectedTowerPairMatch {
    sourceTowerId: string;
    targetTowerId: string;
    pair: SpecificPairRule;
}

const isAdjacentWithinRadius = (
    from: GridPosition,
    to: GridPosition,
    radius: number,
): boolean =>
{
    const dc = Math.abs(from.col - to.col);
    const dr = Math.abs(from.row - to.row);

    return Math.max(dc, dr) <= radius;
};

const pairMatches = (
    source: TowerState,
    target: TowerState,
    sourceTowerId: string,
    targetTowerIds: readonly string[],
): boolean =>
    source.definitionId === sourceTowerId
    && targetTowerIds.includes(target.definitionId)
    && source.id !== target.id;

export const matchesTowerPairRule = (
    tower: TowerState,
    other: TowerState,
    grid: Grid,
    pair: SpecificPairRule,
): boolean =>
{
    if (tower.health <= 0 || other.health <= 0)
    {
        return false;
    }

    if (!pairMatches(tower, other, pair.sourceTowerId, pair.targetTowerIds))
    {
        return false;
    }

    const originTile = grid.toGrid(tower.position.x, tower.position.y);
    const otherTile = grid.toGrid(other.position.x, other.position.y);

    if (!originTile || !otherTile)
    {
        return false;
    }

    const pairOrigin = pair.useSpawnTiles ? tower.spawnTile : originTile;
    const pairOther = pair.useSpawnTiles ? other.spawnTile : otherTile;

    if (!isAdjacentWithinRadius(
        pairOrigin,
        pairOther,
        RACE_BONUS_CONFIG.adjacencyRadiusTiles,
    ))
    {
        return false;
    }

    if (pair.sameRowOnly && pairOrigin.row !== pairOther.row)
    {
        return false;
    }

    return true;
};

export const isTowerPairLinked = (
    tower: TowerState,
    other: TowerState,
    grid: Grid,
): boolean =>
    RACE_BONUS_CONFIG.specificPairBonuses.some((pair) =>
        matchesTowerPairRule(tower, other, grid, pair));

export const computeActiveTowerPairLinks = (
    towers: readonly TowerState[],
    grid: Grid,
): TowerPairLink[] =>
{
    const living = towers.filter((tower) => tower.health > 0);
    const links: TowerPairLink[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < living.length; i++)
    {
        for (let j = i + 1; j < living.length; j++)
        {
            const a = living[i];
            const b = living[j];

            if (!isTowerPairLinked(a, b, grid) && !isTowerPairLinked(b, a, grid))
            {
                continue;
            }

            const key = [ a.id, b.id ].sort().join('|');

            if (seen.has(key))
            {
                continue;
            }

            seen.add(key);
            links.push({ towerIdA: a.id, towerIdB: b.id });
        }
    }

    return links;
};

export interface TowerPairTopology {
    readonly undirectedLinks: readonly TowerPairLink[];
    readonly directedMatchesBySource: ReadonlyMap<string, readonly DirectedTowerPairMatch[]>;
}

export const buildTowerPairTopology = (
    towers: readonly TowerState[],
    grid: Grid,
): TowerPairTopology =>
{
    const living = towers.filter((tower) => tower.health > 0);
    const undirectedLinks: TowerPairLink[] = [];
    const directed = new Map<string, DirectedTowerPairMatch[]>();
    const seenUndirected = new Set<string>();

    for (let i = 0; i < living.length; i++)
    {
        for (let j = i + 1; j < living.length; j++)
        {
            const a = living[i];
            const b = living[j];

            let linked = false;

            for (const pair of RACE_BONUS_CONFIG.specificPairBonuses)
            {
                if (matchesTowerPairRule(a, b, grid, pair))
                {
                    const bucket = directed.get(a.id) ?? [];
                    bucket.push({ sourceTowerId: a.id, targetTowerId: b.id, pair });
                    directed.set(a.id, bucket);
                    linked = true;
                }

                if (matchesTowerPairRule(b, a, grid, pair))
                {
                    const bucket = directed.get(b.id) ?? [];
                    bucket.push({ sourceTowerId: b.id, targetTowerId: a.id, pair });
                    directed.set(b.id, bucket);
                    linked = true;
                }
            }

            if (!linked)
            {
                continue;
            }

            const key = [ a.id, b.id ].sort().join('|');

            if (!seenUndirected.has(key))
            {
                seenUndirected.add(key);
                undirectedLinks.push({ towerIdA: a.id, towerIdB: b.id });
            }
        }
    }

    return {
        undirectedLinks,
        directedMatchesBySource: directed,
    };
};
