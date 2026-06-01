import { buildBlockedTiles } from '../pathfinding/buildBlockedTiles';
import { findPath } from '../pathfinding/aStar';
import { followPathStep, pathToWorldWaypoints } from '../movement/followPath';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import type { GridPosition, WorldPosition } from '../grid/types';
import { isWithinAttackRange } from '../combat/combatRange';
import { stepTowardWorldTarget } from '../movement/followPath';
import { pickTowerMovementTarget } from '../movement/towerMovementTarget';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { CollisionSystem } from './CollisionSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

interface TowerPathState {
    goalKey: string;
    waypoints: WorldPosition[];
}

export class TowerMovementSystem
{
    private readonly paths = new Map<string, TowerPathState>();

    constructor (
        private readonly towers: TowerPlacementSystem,
        private readonly enemies: EnemySpawnSystem,
        private readonly grid: Grid,
        private readonly collision: CollisionSystem,
    ) {}

    tick (_gameTick: number): void
    {
        for (const tower of this.towers.all)
        {
            if (!tower.isMobile || tower.moveSpeedPerTick <= 0)
            {
                continue;
            }

            this.tryMove(tower);
        }
    }

    private tryMove (tower: TowerState): void
    {
        const speed = tower.moveSpeedPerTick;

        if (speed <= 0)
        {
            return;
        }

        const rangePx = this.grid.rangeToPixels(tower.range);
        const target = pickTowerMovementTarget(tower, this.enemies.combatants, rangePx);

        if (!target)
        {
            this.paths.delete(tower.id);
            return;
        }

        const startTile = this.grid.toGrid(tower.position.x, tower.position.y);
        const goalTile = this.grid.toGrid(target.position.x, target.position.y);

        if (!startTile || !goalTile)
        {
            return;
        }

        const goalKey = `${target.id}:${goalTile.col},${goalTile.row}`;
        let pathState = this.paths.get(tower.id);

        if (!pathState || pathState.goalKey !== goalKey)
        {
            pathState = this.planPath(tower.id, startTile, goalTile, goalKey);
            this.paths.set(tower.id, pathState);
        }

        if (pathState.waypoints.length === 0)
        {
            this.chaseTarget(tower, target, speed);
            return;
        }

        const step = followPathStep(
            this.grid,
            tower.position,
            pathState.waypoints,
            speed,
        );

        if (!step)
        {
            this.paths.delete(tower.id);
            return;
        }

        pathState.waypoints = step.path;

        if (!this.collision.setPositionFromPath(tower.id, step.position))
        {
            this.paths.delete(tower.id);
            return;
        }

        tower.position = step.position;
    }

    private planPath (
        towerId: string,
        startTile: GridPosition,
        goalTile: GridPosition,
        goalKey: string,
    ): TowerPathState
    {
        const blocked = buildBlockedTiles(this.grid, this.collision, towerId);
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

    /** Closes the last gap when A* has no tiles left but we are not in range yet. */
    private chaseTarget (tower: TowerState, target: EnemyState, speed: number): void
    {
        const rangePx = this.grid.rangeToPixels(tower.range);

        if (isWithinAttackRange(tower, target, rangePx))
        {
            this.paths.delete(tower.id);
            return;
        }

        const next = stepTowardWorldTarget(tower.position, target.position, speed);

        if (!this.collision.setPositionFromPath(tower.id, next))
        {
            this.paths.delete(tower.id);
            return;
        }

        tower.position = next;
        this.paths.delete(tower.id);
    }

    clearTower (towerId: string): void
    {
        this.paths.delete(towerId);
    }

    clearAll (): void
    {
        this.paths.clear();
    }
}
