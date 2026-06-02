import { getCumulativeScalingDelta, RACE_BONUS_CONFIG } from '../config/raceBonusCatalog';
import type { TowerUpgradeModifiers } from '../config/towerUpgradeCatalog';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import type { TowerPlacementSystem } from './TowerPlacementSystem';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { GridPosition } from '../grid/types';

const MODIFIER_KEYS: (keyof TowerUpgradeModifiers)[] = [
    'range',
    'damage',
    'defense',
    'maxHealth',
    'attacksPerSecond',
    'moveSpeedPerTick',
    'goldValue',
];

const addBonus = (
    target: TowerUpgradeModifiers,
    bonus: TowerUpgradeModifiers,
    stacks = 1,
): void =>
{
    for (const key of MODIFIER_KEYS)
    {
        const value = bonus[key];

        if (value === undefined || value === 0)
        {
            continue;
        }

        target[key] = (target[key] ?? 0) + value * stacks;
    }
};

const raceLabel = (race: TowerState['race']): string =>
{
    switch (race)
    {
        case 'aether-dominion':
            return 'Aether Dominion';
        case 'swarmforge-brood':
            return 'Swarmforge Brood';
        case 'iron-covenant':
            return 'Iron Covenant';
    }
};

export class TowerRaceBonusSystem
{
    constructor (
        private readonly towers: TowerPlacementSystem,
        private readonly grid: Grid,
    ) {}

    tick (_gameTick: number): void
    {
        this.recalculate();
    }

    recalculate (): void
    {
        const all = this.towers.all;

        for (const tower of all)
        {
            if (tower.health <= 0)
            {
                const auraChanged = tower.setAuraBonus({});
                const tagsChanged = tower.setRaceAuraTags([]);

                if (auraChanged || tagsChanged)
                {
                    EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());
                }

                continue;
            }

            const computed = this.computeBonusFor(tower, all);
            const auraChanged = tower.setAuraBonus(computed.bonus);
            const tagsChanged = tower.setRaceAuraTags(computed.tags);

            if (auraChanged || tagsChanged)
            {
                EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());
            }
        }
    }

    private computeBonusFor (
        tower: TowerState,
        all: readonly TowerState[],
    ): { bonus: TowerUpgradeModifiers; tags: string[] }
    {
        const out: TowerUpgradeModifiers = {};
        const stackCounts = new Map<string, number>();
        const tags = new Set<string>();
        const originTile = this.grid.toGrid(tower.position.x, tower.position.y);

        if (!originTile)
        {
            return { bonus: out, tags: [] };
        }

        for (const other of all)
        {
            if (other.id === tower.id || other.health <= 0)
            {
                continue;
            }

            const otherTile = this.grid.toGrid(other.position.x, other.position.y);

            if (!otherTile)
            {
                continue;
            }

            const dc = Math.abs(originTile.col - otherTile.col);
            const dr = Math.abs(originTile.row - otherTile.row);
            const isCurrentAdjacent = Math.max(dc, dr) <= RACE_BONUS_CONFIG.adjacencyRadiusTiles;

            if (isCurrentAdjacent && other.race === tower.race)
            {
                const stacks = this.stackCountFor('same', stackCounts);
                addBonus(out, RACE_BONUS_CONFIG.sameRacePerNeighborBonus[tower.race] ?? {}, stacks);
                this.bumpTag(tags, `${raceLabel(tower.race)} link`);
            }

            for (const link of RACE_BONUS_CONFIG.crossRacePerNeighborBonus)
            {
                if (isCurrentAdjacent && link.sourceRace === tower.race && link.targetRace === other.race)
                {
                    const stacks = this.stackCountFor(`${link.sourceRace}->${link.targetRace}`, stackCounts);
                    addBonus(out, link.bonus, stacks);
                    this.bumpTag(tags, `${raceLabel(tower.race)} -> ${raceLabel(other.race)}`);
                }
            }

            for (const pair of RACE_BONUS_CONFIG.specificPairBonuses)
            {
                if (
                    pair.sourceTowerId !== tower.definitionId
                    || !pair.targetTowerIds.includes(other.definitionId)
                )
                {
                    continue;
                }

                const pairOrigin = pair.useSpawnTiles ? tower.spawnTile : originTile;
                const pairOther = pair.useSpawnTiles ? other.spawnTile : otherTile;
                const pairAdjacent = this.isAdjacentWithinRadius(
                    pairOrigin,
                    pairOther,
                    RACE_BONUS_CONFIG.adjacencyRadiusTiles,
                );

                if (!pairAdjacent)
                {
                    continue;
                }

                if (pair.sameRowOnly && pairOrigin.row !== pairOther.row)
                {
                    continue;
                }

                const key = `pair:${pair.sourceTowerId}->${pair.targetTowerIds.join('|')}:${pair.sameRowOnly ? 'row' : 'adj'}:${pair.useSpawnTiles ? 'spawn' : 'current'}`;
                const seen = (stackCounts.get(key) ?? 0) + 1;

                if (seen > pair.maxStacks)
                {
                    continue;
                }

                stackCounts.set(key, seen);
                addBonus(out, pair.bonus, getCumulativeScalingDelta(pair.countScaling, seen));
                this.bumpTag(
                    tags,
                    `Pair ${pair.sourceTowerId}+${pair.targetTowerIds.join('/')}${pair.sameRowOnly ? ' (same row)' : ''}${pair.useSpawnTiles ? ' (spawn-linked)' : ''}`,
                );
            }
        }

        return { bonus: out, tags: [ ...tags.values() ] };
    }

    private stackCountFor (key: string, counts: Map<string, number>): number
    {
        const seen = (counts.get(`__stack:${key}`) ?? 0) + 1;

        counts.set(`__stack:${key}`, seen);

        if (RACE_BONUS_CONFIG.stackMode === 'nonStacking')
        {
            return seen === 1 ? 1 : 0;
        }

        return seen <= RACE_BONUS_CONFIG.maxStacksPerSource ? 1 : 0;
    }

    private bumpTag (tags: Set<string>, tag: string): void
    {
        tags.add(tag);
    }

    private isAdjacentWithinRadius (
        from: GridPosition,
        to: GridPosition,
        radius: number,
    ): boolean
    {
        const dc = Math.abs(from.col - to.col);
        const dr = Math.abs(from.row - to.row);

        return Math.max(dc, dr) <= radius;
    }
}

