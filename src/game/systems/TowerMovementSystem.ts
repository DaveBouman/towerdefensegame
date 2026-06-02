import { buildBlockedTiles } from '../pathfinding/buildBlockedTiles';
import { findPath } from '../pathfinding/aStar';
import { pickSurroundGoalTile } from '../pathfinding/surroundGoal';
import { tileKey } from '../pathfinding/tileKey';
import { followPathStep, pathToWorldWaypoints, stepTowardWorldTarget } from '../movement/followPath';
import { tileCenterWorld } from '../grid/worldPosition';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import type { GridPosition, WorldPosition } from '../grid/types';
import { isWithinAttackRange } from '../combat/combatRange';
import { pickTowerMovementTarget } from '../movement/towerMovementTarget';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { CollisionSystem } from './CollisionSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

interface TowerPathState {
    goalKey: string;
    goalTile: GridPosition;
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
            if (tower.health <= 0 || !tower.isMobile || tower.moveSpeedPerTick <= 0)
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
        const target = pickTowerMovementTarget(
            tower,
            this.enemies.attackableByTowers,
            rangePx,
        );

        if (!target)
        {
            this.paths.delete(tower.id);
            return;
        }

        const startTile = this.grid.toGrid(tower.position.x, tower.position.y);

        if (!startTile)
        {
            return;
        }

        const goalKey = `${target.id}`;
        let pathState = this.paths.get(tower.id);

        if (!pathState || pathState.goalKey !== goalKey)
        {
            pathState = this.planPath(tower, target, startTile, goalKey);
            this.paths.set(tower.id, pathState);
        }

        if (pathState.waypoints.length === 0)
        {
            this.chaseTarget(tower, target, pathState.goalTile, speed);

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
            this.chaseTarget(tower, target, pathState.goalTile, speed);

            return;
        }

        pathState.waypoints = step.path;

        if (!this.collision.tryMove(tower.id, step.position))
        {
            this.paths.delete(tower.id);

            return;
        }

        tower.position = step.position;
    }

    private planPath (
        tower: TowerState,
        target: EnemyState,
        startTile: GridPosition,
        goalKey: string,
    ): TowerPathState
    {
        const blocked = buildBlockedTiles(this.grid, this.collision, tower.id);
        const rangePx = this.grid.rangeToPixels(tower.range);
        const reservedGoals = this.collectReservedGoalTiles(tower.id, target.id);
        const slotIndex = this.slotIndexForTarget(tower.id, target.id);
        const targetTile = this.grid.toGrid(target.position.x, target.position.y)
            ?? this.grid.layout.playfieldAnchorTile(target.position);

        if (targetTile)
        {
            blocked.add(tileKey(targetTile));
        }

        const goalTile = pickSurroundGoalTile(
            this.grid,
            startTile,
            target,
            tower.bodyHalfWidth,
            tower.bodyHalfHeight,
            rangePx,
            blocked,
            reservedGoals,
            slotIndex,
        ) ?? targetTile ?? startTile;

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

    private chaseTarget (
        tower: TowerState,
        target: EnemyState,
        goalTile: GridPosition,
        speed: number,
    ): void
    {
        const rangePx = this.grid.rangeToPixels(tower.range);

        if (isWithinAttackRange(tower, target, rangePx))
        {
            this.paths.delete(tower.id);

            return;
        }

        const standGoal = target.isNexus
            ? target.position
            : tileCenterWorld(this.grid.config, goalTile);
        const next = stepTowardWorldTarget(tower.position, standGoal, speed);

        if (!this.collision.tryMove(tower.id, next))
        {
            this.paths.delete(tower.id);

            return;
        }

        tower.position = next;
        this.paths.delete(tower.id);
    }

    private collectReservedGoalTiles (towerId: string, targetId: string): Set<string>
    {
        const reserved = new Set<string>();

        for (const [ id, state ] of this.paths)
        {
            if (id === towerId || state.goalKey !== targetId)
            {
                continue;
            }

            reserved.add(tileKey(state.goalTile));
        }

        return reserved;
    }

    private slotIndexForTarget (towerId: string, targetId: string): number
    {
        const squad = this.towers.all
            .filter((tower) => tower.isMobile && this.moveTargetId(tower) === targetId)
            .map((tower) => tower.id)
            .sort();

        const index = squad.indexOf(towerId);

        return index >= 0 ? index : 0;
    }

    private moveTargetId (tower: TowerState): string
    {
        const rangePx = this.grid.rangeToPixels(tower.range);
        const target = pickTowerMovementTarget(
            tower,
            this.enemies.attackableByTowers,
            rangePx,
        );

        return target?.id ?? '';
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
