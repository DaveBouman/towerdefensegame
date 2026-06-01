import { buildBlockedTiles } from '../pathfinding/buildBlockedTiles';
import { findPath } from '../pathfinding/aStar';
import { pickSurroundGoalTile } from '../pathfinding/surroundGoal';
import { tileKey } from '../pathfinding/tileKey';
import { followPathStep, pathToWorldWaypoints, stepTowardWorldTarget } from '../movement/followPath';
import { tileCenterWorld } from '../grid/worldPosition';
import { canEnemiesTargetPlayerNexus, livingTowers } from '../combat/targetPriority';
import type { CombatEntity } from '../combat/combatRange';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import type { GridPosition, WorldPosition } from '../grid/types';
import { isWithinAttackRange } from '../combat/combatRange';
import { worldDistance } from '../grid/worldPosition';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { CollisionSystem } from './CollisionSystem';
import type { PlayerNexusSystem } from './PlayerNexusSystem';
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
        private readonly playerNexus: PlayerNexusSystem,
        private readonly grid: Grid,
        private readonly collision: CollisionSystem,
    ) {}

    tick (_gameTick: number): void
    {
        const movers = this.enemies.all
            .filter((enemy) => enemy.health > 0 && !enemy.isPreview && !enemy.isNexus)
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

        const tower = this.findNearestTower(enemy);

        if (tower)
        {
            this.moveTowardTarget(enemy, tower, tower.id, speed);

            return;
        }

        const nexus = this.playerNexus.active;

        if (!nexus || nexus.health <= 0 || !canEnemiesTargetPlayerNexus(this.towers.all))
        {
            this.paths.delete(enemy.id);

            return;
        }

        this.moveTowardTarget(enemy, nexus, 'player-nexus', speed);
    }

    private moveTowardTarget (
        enemy: EnemyState,
        target: CombatEntity,
        targetId: string,
        speed: number,
    ): void
    {
        const rangePx = this.grid.rangeToPixels(enemy.stats.range);

        if (isWithinAttackRange(enemy, target, rangePx))
        {
            this.paths.delete(enemy.id);

            return;
        }

        const startTile = this.grid.toGrid(enemy.position.x, enemy.position.y);
        const targetTile = this.grid.toGrid(target.position.x, target.position.y);

        if (!startTile || !targetTile)
        {
            return;
        }

        const goalKey = `${targetId}:${targetTile.col},${targetTile.row}`;
        let pathState = this.paths.get(enemy.id);

        if (!pathState || pathState.goalKey !== goalKey)
        {
            pathState = this.planPath(enemy, target, startTile, targetTile, goalKey, targetId);
            this.paths.set(enemy.id, pathState);
        }

        if (pathState.waypoints.length === 0)
        {
            this.chaseTarget(enemy, target, pathState.goalTile, speed);

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
            this.chaseTarget(enemy, target, pathState.goalTile, speed);

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

    /** Walk the final distance when pathfinding ends one tile short of attack range. */
    private chaseTarget (
        enemy: EnemyState,
        target: CombatEntity,
        goalTile: GridPosition,
        speed: number,
    ): void
    {
        const rangePx = this.grid.rangeToPixels(enemy.stats.range);

        if (isWithinAttackRange(enemy, target, rangePx))
        {
            this.paths.delete(enemy.id);

            return;
        }

        const standGoal = tileCenterWorld(this.grid.config, goalTile);
        const next = stepTowardWorldTarget(enemy.position, standGoal, speed);

        if (!this.collision.setPositionFromPath(enemy.id, next))
        {
            this.paths.delete(enemy.id);

            return;
        }

        enemy.position = next;
        this.paths.delete(enemy.id);
    }

    private planPath (
        enemy: EnemyState,
        target: CombatEntity,
        startTile: GridPosition,
        targetTile: GridPosition,
        goalKey: string,
        targetId: string,
    ): EnemyPathState
    {
        const blocked = buildBlockedTiles(this.grid, this.collision, enemy.id);

        blocked.add(tileKey(targetTile));

        const rangePx = this.grid.rangeToPixels(enemy.stats.range);
        const reservedGoals = this.collectReservedGoalTiles(enemy.id, targetId);
        const slotIndex = this.slotIndexForTarget(enemy.id, targetId);
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
        ) ?? targetTile;

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

    private slotIndexForTarget (enemyId: string, targetId: string): number
    {
        const squad = this.enemies.combatants
            .filter((other) => this.moveTargetId(other) === targetId)
            .map((other) => other.id)
            .sort();

        const index = squad.indexOf(enemyId);

        return index >= 0 ? index : 0;
    }

    private moveTargetId (enemy: EnemyState): string
    {
        const tower = this.findNearestTower(enemy);

        if (tower)
        {
            return tower.id;
        }

        if (canEnemiesTargetPlayerNexus(this.towers.all))
        {
            return 'player-nexus';
        }

        return '';
    }

    private findNearestTower (enemy: EnemyState): TowerState | null
    {
        let closest: TowerState | null = null;
        let closestDistance = Infinity;

        for (const tower of livingTowers(this.towers.all))
        {
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
