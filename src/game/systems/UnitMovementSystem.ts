import { buildPathfindingBlockedTiles } from '../pathfinding/buildBlockedTiles';
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
import { edgeToEdgeDistance, isWithinAttackRange } from '../combat/combatRange';
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

const TOWER_HOLD_RANGE_BUFFER_TILES = 0.15;

export class UnitMovementSystem
{
    private readonly paths = new Map<string, UnitPathState>();
    private readonly towerHoldingAttackRange = new Set<string>();

    constructor (
        private readonly enemies: EnemySpawnSystem,
        private readonly towers: TowerPlacementSystem,
        private readonly playerNexus: PlayerNexusSystem,
        private readonly grid: Grid,
        private readonly collision: CollisionSystem,
    ) {}

    tick (gameTick: number): void
    {
        const enemies = this.rotateProcessingOrder(
            this.enemies.all.filter((enemy) => enemy.health > 0 && !enemy.isPreview && !enemy.isNexus),
            gameTick,
        );

        for (const enemy of enemies)
        {
            this.tryMoveEnemy(enemy);
        }

        const mobileTowers = this.towers.all.filter((tower) =>
            tower.health > 0 && tower.isMobile && tower.moveSpeedPerTick > 0);

        for (const tower of this.rotateProcessingOrder(mobileTowers, gameTick))
        {
            this.tryMoveTower(tower);
        }
    }

    clearUnit (unitId: string): void
    {
        this.paths.delete(unitId);
        this.towerHoldingAttackRange.delete(unitId);
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
        this.towerHoldingAttackRange.clear();
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
            return;
        }

        const goal = this.enemyMoveGoal(target, targetId);
        const next = stepTowardWorldTarget(enemy.position, goal, speed);

        if (this.tryDirectMove(enemy.id, next))
        {
            enemy.position = next;
        }
    }

    private enemyMoveGoal (target: CombatEntity, targetId: string): WorldPosition
    {
        if (targetId === 'player-nexus')
        {
            return tileCenterWorld(this.grid.config, getPlayerNexusApproachTile());
        }

        return { ...target.position };
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
        const rangePx = this.grid.rangeToPixels(tower.range);
        const target = pickTowerMovementTarget(
            tower,
            this.enemies.attackableByTowers,
            rangePx,
        );

        if (!target)
        {
            this.paths.delete(tower.id);
            this.towerHoldingAttackRange.add(tower.id);
            return;
        }

        if (this.shouldTowerHoldAttackRange(tower, target, rangePx))
        {
            this.paths.delete(tower.id);
            return;
        }

        this.towerHoldingAttackRange.delete(tower.id);

        const startTile = this.grid.toGrid(tower.position.x, tower.position.y);

        if (!startTile)
        {
            return;
        }

        const targetTile = this.grid.toGrid(target.position.x, target.position.y)
            ?? this.grid.layout.playfieldAnchorTile(target.position);

        if (!targetTile)
        {
            return;
        }

        const goalKey = `${target.id}:${targetTile.col},${targetTile.row}`;
        let pathState = this.paths.get(tower.id);

        if (!pathState || pathState.goalKey !== goalKey)
        {
            pathState = this.planTowerPath(tower, target, startTile, goalKey);
            this.paths.set(tower.id, pathState);
        }

        if (pathState.waypoints.length === 0)
        {
            this.advanceTowerDirectly(tower, target, pathState.goalTile, speed);
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
            this.advanceTowerDirectly(tower, target, pathState.goalTile, speed);
            return;
        }

        if (this.tryDirectMove(tower.id, step.position))
        {
            tower.position = step.position;
            pathState.waypoints = step.path;
        }
    }

    private planTowerPath (
        tower: TowerState,
        target: EnemyState,
        startTile: GridPosition,
        goalKey: string,
    ): UnitPathState
    {
        const blocked = buildPathfindingBlockedTiles(this.grid, this.collision, tower.id);
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

    private advanceTowerDirectly (
        tower: TowerState,
        target: EnemyState,
        goalTile: GridPosition,
        speed: number,
    ): void
    {
        const standGoal = target.isNexus
            ? target.position
            : tileCenterWorld(this.grid.config, goalTile);
        const next = stepTowardWorldTarget(tower.position, standGoal, speed);

        if (this.tryDirectMove(tower.id, next))
        {
            tower.position = next;
        }
    }

    private shouldTowerHoldAttackRange (
        tower: TowerState,
        target: CombatEntity,
        rangePx: number,
    ): boolean
    {
        const distance = edgeToEdgeDistance(tower, target, rangePx);
        const holdBuffer = this.grid.config.tileSize * TOWER_HOLD_RANGE_BUFFER_TILES;

        if (this.towerHoldingAttackRange.has(tower.id))
        {
            if (distance <= rangePx + holdBuffer)
            {
                return true;
            }

            this.towerHoldingAttackRange.delete(tower.id);
        }

        if (distance <= rangePx)
        {
            this.towerHoldingAttackRange.add(tower.id);
            return true;
        }

        return false;
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

        for (const enemy of this.enemies.all)
        {
            if (
                enemy.id === unitId
                || enemy.health <= 0
                || enemy.isPreview
                || enemy.isNexus
                || this.enemyMoveTargetId(enemy) !== targetId
            )
            {
                continue;
            }

            this.reserveTileAt(reserved, enemy.position);
        }

        for (const tower of this.towers.all)
        {
            if (
                tower.id === unitId
                || tower.health <= 0
                || !tower.isMobile
                || this.towerMoveTargetId(tower) !== targetId
            )
            {
                continue;
            }

            this.reserveTileAt(reserved, tower.position);
        }

        return reserved;
    }

    private reserveTileAt (reserved: Set<string>, position: WorldPosition): void
    {
        const tile = this.grid.toGrid(position.x, position.y);

        if (tile)
        {
            reserved.add(tileKey(tile));
        }
    }

    private tryDirectMove (unitId: string, position: WorldPosition): boolean
    {
        return this.collision.tryMove(unitId, position);
    }

    private rotateProcessingOrder<T extends { id: string }> (
        units: readonly T[],
        gameTick: number,
    ): T[]
    {
        if (units.length <= 1)
        {
            return [ ...units ];
        }

        const sorted = [ ...units ].sort((a, b) => a.id.localeCompare(b.id));
        const offset = gameTick % sorted.length;

        return [ ...sorted.slice(offset), ...sorted.slice(0, offset) ];
    }
}

