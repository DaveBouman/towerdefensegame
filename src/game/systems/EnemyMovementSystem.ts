import { buildBlockedTiles } from '../pathfinding/buildBlockedTiles';
import { findPath } from '../pathfinding/aStar';
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
        for (const enemy of this.enemies.all)
        {
            if (enemy.health <= 0)
            {
                continue;
            }

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
        const goalTile = this.grid.toGrid(target.position.x, target.position.y);

        if (!startTile || !goalTile)
        {
            return;
        }

        const goalKey = `${target.id}:${goalTile.col},${goalTile.row}`;
        let pathState = this.paths.get(enemy.id);

        if (!pathState || pathState.goalKey !== goalKey)
        {
            pathState = this.planPath(enemy.id, startTile, goalTile, goalKey);
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

        if (!this.collision.setPositionFromPath(enemy.id, step.position))
        {
            this.paths.delete(enemy.id);
            return;
        }

        enemy.position = step.position;
    }

    private planPath (
        enemyId: string,
        startTile: GridPosition,
        goalTile: GridPosition,
        goalKey: string,
    ): EnemyPathState
    {
        const blocked = buildBlockedTiles(this.grid, this.collision, enemyId);
        const tilePath = findPath(this.grid, startTile, goalTile, blocked);

        if (!tilePath)
        {
            return { goalKey, waypoints: [] };
        }

        return {
            goalKey,
            waypoints: pathToWorldWaypoints(this.grid, tilePath),
        };
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
}
