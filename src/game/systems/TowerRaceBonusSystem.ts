import { getCumulativeScalingDelta, RACE_BONUS_CONFIG } from '../config/raceBonusCatalog';
import type { TowerUpgradeModifiers } from '../config/towerUpgradeCatalog';
import { buildTowerPairTopology, type TowerPairLink } from '../combat/towerPairLinks';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import type { TowerPlacementSystem } from './TowerPlacementSystem';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';

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
    private topologyLayoutKey = '';
    private pairTopology: ReturnType<typeof buildTowerPairTopology>;
    private activePairLinks: TowerPairLink[] = [];

    constructor (
        private readonly towers: TowerPlacementSystem,
        private readonly grid: Grid,
    )
    {
        this.pairTopology = buildTowerPairTopology([], grid);
    }

    tick (_gameTick: number): void
    {
        this.recalculate();
    }

    recalculate (): void
    {
        const all = this.towers.all;
        this.ensurePairTopology(all);
        this.activePairLinks = this.pairTopology.undirectedLinks.filter((link) =>
        {
            const a = all.find((tower) => tower.id === link.towerIdA);
            const b = all.find((tower) => tower.id === link.towerIdB);

            return Boolean(a && b && a.health > 0 && b.health > 0);
        });

        for (const tower of all)
        {
            if (tower.health <= 0)
            {
                const auraChanged = tower.setAuraBonus({});
                const tagsChanged = tower.setRaceAuraTags([]);

                if (auraChanged || tagsChanged)
                {
                    EventBus.emit(GAME_EVENTS.TOWER_UPDATED, tower.snapshot());
                }

                continue;
            }

            const computed = this.computeBonusFor(tower, all);
            const auraChanged = tower.setAuraBonus(computed.bonus);
            const tagsChanged = tower.setRaceAuraTags(computed.tags);

            if (auraChanged || tagsChanged)
            {
                EventBus.emit(GAME_EVENTS.TOWER_UPDATED, tower.snapshot());
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
                if (pair.sourceTowerId !== tower.definitionId)
                {
                    continue;
                }

                const matches = (this.pairTopology.directedMatchesBySource.get(tower.id) ?? [])
                    .filter((entry) =>
                        entry.pair === pair && all.some((candidate) =>
                            candidate.id === entry.targetTowerId && candidate.health > 0));

                if (matches.length === 0)
                {
                    continue;
                }

                const seen = Math.min(matches.length, pair.maxStacks);

                for (let count = 1; count <= seen; count++)
                {
                    addBonus(out, pair.bonus, getCumulativeScalingDelta(pair.countScaling, count));
                }

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

    getActivePairLinks (): readonly TowerPairLink[]
    {
        return this.activePairLinks;
    }

    private ensurePairTopology (all: readonly TowerState[]): void
    {
        const layoutKey = all
            .map((tower) => `${tower.id}:${tower.definitionId}:${tower.spawnTile.col}:${tower.spawnTile.row}`)
            .sort()
            .join('|');

        if (layoutKey === this.topologyLayoutKey)
        {
            return;
        }

        this.topologyLayoutKey = layoutKey;
        this.pairTopology = buildTowerPairTopology(all, this.grid);
    }
}

