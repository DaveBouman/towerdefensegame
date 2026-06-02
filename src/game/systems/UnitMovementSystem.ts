import { buildBlockedTiles } from '../pathfinding/buildBlockedTiles';
import { findPath } from '../pathfinding/aStar';
import { pickSurroundGoalTile } from '../pathfinding/surroundGoal';
import { tileKey } from '../pathfinding/tileKey';
import { followPathStep, pathToWorldWaypoints, stepTowardWorldTarget } from '../movement/followPath';
import { tileCenterWorld, worldDistance } from '../grid/worldPosition';
import { getPlayerNexusApproachTile } from '../config/nexusConfig';
import { canEnemiesTargetPlayerNexus, livingTowers } from '../combat/targetPriority';
import type { CombatEntity } from '../combat/combatRange';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import { rangeTilesToPixels } from '../grid/rangePixels';
import type { GridPosition, WorldPosition } from '../grid/types';
import { isWithinAttackRange } from '../combat/combatRange';
import { pickTowerMovementTarget } from '../movement/towerMovementTarget';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { CollisionSystem } from './CollisionSystem';
import type { PlayerNexusSystem } from './PlayerNexusSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

interface UnitPathState {
    goalKey: string;
    goalTile: GridPosition;
    waypoints: WorldPosition[];
}

export class UnitMovementSystem
{
    private readonly paths = new Map<string, UnitPathState>();

    constructor (
        private readonly enemies: EnemySpawnSystem,
        private readonly towers: TowerPlacementSystem,
        private readonly playerNexus: PlayerNexusSystem,
        private readonly grid: Grid,
        private readonly collision: CollisionSystem,
    ) {}

    tick (_gameTick: number): void
    {
        const enemies = this.enemies.all
            .filter((enemy) => enemy.health > 0 && !enemy.isPreview && !enemy.isNexus)
            .sort((a, b) => a.id.localeCompare(b.id));

        for (const enemy of enemies)
        {
            this.tryMoveEnemy(enemy);
        }

        for (const tower of this.towers.all)
        {
            if (tower.health <= 0 || !tower.isMobile || tower.moveSpeedPerTick <= 0)
            {
                continue;
            }

            this.tryMoveTower(tower);
        }
    }

    clearUnit (unitId: string): void
    {
        this.paths.delete(unitId);
    }

    clearEnemy (enemyId: string): void
    {
        this.clearUnit(enemyId);
    }

    clearTower (towerId: string): void
    {
        this.clearUnit(towerId);
    }

    clearAll (): void
    {
        this.paths.clear();
    }

    private tryMoveEnemy (enemy: EnemyState): void
    {
        const speed = enemy.stats.moveSpeedPerTick;

        if (speed <= 0)
        {
            return;
        }

        const tower = this.findNearestTower(enemy);

        if (tower)
        {
            this.moveEnemyTowardTarget(enemy, tower, tower.id, speed);
            return;
        }

        const nexus = this.playerNexus.active;

        if (!nexus || nexus.health <= 0 || !canEnemiesTargetPlayerNexus(this.towers.all))
        {
            this.paths.delete(enemy.id);
            return;
        }

        this.moveEnemyTowardTarget(enemy, nexus, 'player-nexus', speed);
    }

    private moveEnemyTowardTarget (
        enemy: EnemyState,
        target: CombatEntity,
        targetId: string,
        speed: number,
    ): void
    {
        const rangePx = rangeTilesToPixels(this.grid, enemy.stats.range);

        if (isWithinAttackRange(enemy, target, rangePx))
        {
            this.paths.delete(enemy.id);
            return;
        }

        const startTile = this.grid.toGrid(enemy.position.x, enemy.position.y);

        if (!startTile)
        {
            return;
        }

        const goalTile = targetId === 'player-nexus'
            ? getPlayerNexusApproachTile()
            : this.grid.toGrid(target.position.x, target.position.y);

        if (!goalTile)
        {
            return;
        }

        const goalKey = `${targetId}:${goalTile.col},${goalTile.row}`;
        let pathState = this.paths.get(enemy.id);

        if (!pathState || pathState.goalKey !== goalKey)
        {
            pathState = this.planEnemyPath(enemy, target, startTile, goalTile, goalKey, targetId);
            this.paths.set(enemy.id, pathState);
        }

        if (pathState.waypoints.length === 0)
        {
            this.chaseEnemyTarget(enemy, target, pathState.goalTile, targetId, speed);
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
            this.chaseEnemyTarget(enemy, target, pathState.goalTile, targetId, speed);
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

    private planEnemyPath (
        enemy: EnemyState,
        target: CombatEntity,
        startTile: GridPosition,
        targetTile: GridPosition,
        goalKey: string,
        targetId: string,
    ): UnitPathState
    {
        const blocked = buildBlockedTiles(this.grid, this.collision, enemy.id);
        blocked.add(tileKey(targetTile));

        const rangePx = rangeTilesToPixels(this.grid, enemy.stats.range);
        const reservedGoals = this.collectReservedGoalTiles(enemy.id, targetId);
        const slotIndex = this.slotIndexForEnemyTarget(enemy.id, targetId);
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

    private chaseEnemyTarget (
        enemy: EnemyState,
        target: CombatEntity,
        goalTile: GridPosition,
        targetId: string,
        speed: number,
    ): void
    {
        const rangePx = rangeTilesToPixels(this.grid, enemy.stats.range);

        if (isWithinAttackRange(enemy, target, rangePx))
        {
            this.paths.delete(enemy.id);
            return;
        }

        const standGoal = targetId === 'player-nexus'
            ? target.position
            : tileCenterWorld(this.grid.config, goalTile);
        const next = stepTowardWorldTarget(enemy.position, standGoal, speed);

        if (!this.collision.tryMove(enemy.id, next))
        {
            this.paths.delete(enemy.id);
            return;
        }

        enemy.position = next;
        this.paths.delete(enemy.id);
    }

    private slotIndexForEnemyTarget (enemyId: string, targetId: string): number
    {
        const squad = this.enemies.combatants
            .filter((other) => this.enemyMoveTargetId(other) === targetId)
            .map((other) => other.id)
            .sort();

        const index = squad.indexOf(enemyId);

        return index >= 0 ? index : 0;
    }

    private enemyMoveTargetId (enemy: EnemyState): string
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

    private tryMoveTower (tower: TowerState): void
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
            pathState = this.planTowerPath(tower, target, startTile, goalKey);
            this.paths.set(tower.id, pathState);
        }

        if (pathState.waypoints.length === 0)
        {
            this.chaseTowerTarget(tower, target, pathState.goalTile, speed);
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
            this.chaseTowerTarget(tower, target, pathState.goalTile, speed);
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

    private planTowerPath (
        tower: TowerState,
        target: EnemyState,
        startTile: GridPosition,
        goalKey: string,
    ): UnitPathState
    {
        const blocked = buildBlockedTiles(this.grid, this.collision, tower.id);
        const rangePx = this.grid.rangeToPixels(tower.range);
        const reservedGoals = this.collectReservedGoalTiles(tower.id, target.id);
        const slotIndex = this.slotIndexForTowerTarget(tower.id, target.id);
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

    private chaseTowerTarget (
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

    private slotIndexForTowerTarget (towerId: string, targetId: string): number
    {
        const squad = this.towers.all
            .filter((tower) => tower.isMobile && this.towerMoveTargetId(tower) === targetId)
            .map((tower) => tower.id)
            .sort();

        const index = squad.indexOf(towerId);

        return index >= 0 ? index : 0;
    }

    private towerMoveTargetId (tower: TowerState): string
    {
        const rangePx = this.grid.rangeToPixels(tower.range);
        const target = pickTowerMovementTarget(
            tower,
            this.enemies.attackableByTowers,
            rangePx,
        );

        return target?.id ?? '';
    }

    private collectReservedGoalTiles (unitId: string, targetId: string): Set<string>
    {
        const reserved = new Set<string>();

        for (const [ id, state ] of this.paths)
        {
            if (id === unitId || !state.goalKey.startsWith(targetId))
            {
                continue;
            }

            reserved.add(tileKey(state.goalTile));
        }

        return reserved;
    }
}

