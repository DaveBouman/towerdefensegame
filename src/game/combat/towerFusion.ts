import { TOWER_FUSION_MIN_GROUP_SIZE } from '../config/towerFusionConfig';
import type { TowerDefinitionId } from '../config/towerCatalog';
import type { TowerState } from '../domain/TowerState';
import type { TowerPairLink } from './towerPairLinks';
import type { GridPosition } from '../grid/types';

const isOrthogonallyAdjacent = (a: GridPosition, b: GridPosition): boolean =>
{
    const dc = Math.abs(a.col - b.col);
    const dr = Math.abs(a.row - b.row);

    return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
};

const isEligibleForFusion = (tower: TowerState): boolean => tower.health > 0;

const findConnectedGroups = (
    candidates: readonly TowerState[],
): TowerState[][] =>
{
    const visited = new Set<string>();
    const groups: TowerState[][] = [];

    for (const start of candidates)
    {
        if (visited.has(start.id))
        {
            continue;
        }

        const group: TowerState[] = [];
        const queue = [ start ];

        visited.add(start.id);

        while (queue.length > 0)
        {
            const current = queue.shift()!;

            group.push(current);

            for (const other of candidates)
            {
                if (visited.has(other.id))
                {
                    continue;
                }

                if (!isOrthogonallyAdjacent(current.spawnTile, other.spawnTile))
                {
                    continue;
                }

                visited.add(other.id);
                queue.push(other);
            }
        }

        if (group.length >= TOWER_FUSION_MIN_GROUP_SIZE)
        {
            groups.push(group);
        }
    }

    return groups;
};

export const findTowerFusionGroups = (towers: readonly TowerState[]): TowerState[][] =>
{
    const eligible = towers.filter(isEligibleForFusion);
    const byDefinitionId = new Map<TowerDefinitionId, TowerState[]>();

    for (const tower of eligible)
    {
        const bucket = byDefinitionId.get(tower.definitionId) ?? [];

        bucket.push(tower);
        byDefinitionId.set(tower.definitionId, bucket);
    }

    return [ ...byDefinitionId.values() ].flatMap(findConnectedGroups);
};

export const getTowerFusionPreviewLinks = (
    towers: readonly TowerState[],
): TowerPairLink[] =>
{
    const links: TowerPairLink[] = [];
    const seen = new Set<string>();

    for (const group of findTowerFusionGroups(towers))
    {
        for (let i = 0; i < group.length; i++)
        {
            for (let j = i + 1; j < group.length; j++)
            {
                const a = group[i];
                const b = group[j];

                if (!isOrthogonallyAdjacent(a.spawnTile, b.spawnTile))
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
    }

    return links;
};

export const pickFusionAnchor = (group: readonly TowerState[]): TowerState =>
{
    const sorted = [ ...group ].sort((a, b) =>
        a.spawnTile.row - b.spawnTile.row
        || a.spawnTile.col - b.spawnTile.col
        || a.id.localeCompare(b.id));

    return sorted[Math.floor(sorted.length / 2)]!;
};
