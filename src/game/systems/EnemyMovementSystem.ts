import { buildBlockedTiles } from '../pathfinding/buildBlockedTiles';
import { findPath } from '../pathfinding/aStar';
import { pickSurroundGoalTile } from '../pathfinding/surroundGoal';
import { tileKey } from '../pathfinding/tileKey';
import { followPathStep, pathToWorldWaypoints } from '../movement/followPath';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import type { GridPosition, WorldPosition } from '../grid/types';
import { isWithinAttackRange } from '../combat/combatRange';
import { worldDistance } from '../grid/worldPosition';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { CollisionSystem } from './CollisionSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

interface EnemyPathState
{
    goalKey: string;
    goalTile: GridPosition;
    waypoints: WorldPosition[];
}

export class EnemyMovementSystem
{
    private readonly paths = new Map<string, EnemyPathState>();

    constructor (
        private readonly enemies: EnemySpawnSystem,
        private readonly towers: TowerPlacementSystem,
        private readonly grid: Grid,
        private readonly collision: CollisionSystem,
    ) {}

    tick (_gameTick: number): void
    {
        const movers = this.enemies.all
            .filter((enemy) => enemy.health > 0 && !enemy.isPreview)
            .sort((a, b) => a.id.localeCompare(b.id));

        for (const enemy of movers)
        {
            this.tryMove(enemy);
        }
    }

    private tryMove (enemy: EnemyState): void
    {
        const speed = enemy.stats.moveSpeedPerTick;

        if (speed <= 0)
        {
            return;
        }

        const target = this.findNearestTower(enemy);

        if (!target)
        {
            this.paths.delete(enemy.id);
            return;
        }

        const rangePx = this.grid.rangeToPixels(enemy.stats.range);

        if (isWithinAttackRange(enemy, target, rangePx))
        {
            this.paths.delete(enemy.id);
            return;
        }

        const startTile = this.grid.toGrid(enemy.position.x, enemy.position.y);
        const towerTile = this.grid.toGrid(target.position.x, target.position.y);

        if (!startTile || !towerTile)
        {
            return;
        }

        const goalKey = `${target.id}:${towerTile.col},${towerTile.row}`;
        let pathState = this.paths.get(enemy.id);

        if (!pathState || pathState.goalKey !== goalKey)
        {
            pathState = this.planPath(enemy, target, startTile, towerTile, goalKey);
            this.paths.set(enemy.id, pathState);
        }

        if (pathState.waypoints.length === 0)
        {
            return;
        }

        const step = followPathStep(
            this.grid,
            enemy.position,
            pathState.waypoints,
            speed,
        );

        if (!step)
        {
            this.paths.delete(enemy.id);
            return;
        }

        pathState.waypoints = step.path;

        if (!this.collision.tryMove(enemy.id, step.position))
        {
            this.paths.delete(enemy.id);
            return;
        }

        enemy.position = step.position;
    }

    private planPath (
        enemy: EnemyState,
        target: TowerState,
        startTile: GridPosition,
        towerTile: GridPosition,
        goalKey: string,
    ): EnemyPathState
    {
        const blocked = buildBlockedTiles(this.grid, this.collision, enemy.id);

        blocked.add(tileKey(towerTile));

        const rangePx = this.grid.rangeToPixels(enemy.stats.range);
        const reservedGoals = this.collectReservedGoalTiles(enemy.id, target.id);
        const slotIndex = this.slotIndexForTower(enemy.id, target.id);
        const goalTile = pickSurroundGoalTile(
            this.grid,
            startTile,
            target,
            enemy.bodyHalfWidth,
            enemy.bodyHalfHeight,
            rangePx,
            blocked,
            reservedGoals,
            slotIndex,
        ) ?? towerTile;

        const tilePath = findPath(this.grid, startTile, goalTile, blocked);

        if (!tilePath)
        {
            return { goalKey, goalTile, waypoints: [] };
        }

        return {
            goalKey,
            goalTile,
            waypoints: pathToWorldWaypoints(this.grid, tilePath),
        };
    }

    private collectReservedGoalTiles (enemyId: string, towerId: string): Set<string>
    {
        const reserved = new Set<string>();

        for (const [ id, state ] of this.paths)
        {
            if (id === enemyId || !state.goalKey.startsWith(`${towerId}:`))
            {
                continue;
            }

            reserved.add(tileKey(state.goalTile));
        }

        return reserved;
    }

    private slotIndexForTower (enemyId: string, towerId: string): number
    {
        const squad = this.enemies.combatants
            .filter((other) => this.findNearestTower(other)?.id === towerId)
            .map((other) => other.id)
            .sort();

        const index = squad.indexOf(enemyId);

        return index >= 0 ? index : 0;
    }

    private findNearestTower (enemy: EnemyState): TowerState | null
    {
        let closest: TowerState | null = null;
        let closestDistance = Infinity;

        for (const tower of this.towers.all)
        {
            if (tower.health <= 0)
            {
                continue;
            }

            const towerDistance = worldDistance(enemy.position, tower.position);

            if (towerDistance < closestDistance)
            {
                closest = tower;
                closestDistance = towerDistance;
            }
        }

        return closest;
    }

    clearEnemy (enemyId: string): void
    {
        this.paths.delete(enemyId);
    }

    clearAll (): void
    {
        this.paths.clear();
    }
}
