import { stepTowardWorldTarget } from '../movement/followPath';
import { tryLateralMove } from '../movement/tryMoveWithAvoidance';
import type { OccupantKind } from '../collision/types';
import { tileCenterWorld, worldDistance } from '../grid/worldPosition';
import { livingTowers } from '../combat/targetPriority';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { Grid } from '../grid/Grid';
import { rangeTilesToPixels } from '../grid/rangePixels';
import type { GridPosition, WorldPosition } from '../grid/types';
import { isWithinAttackRange } from '../combat/combatRange';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { CollisionSystem } from './CollisionSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

const IGNORE_ENEMY_COLLISION = new Set<OccupantKind>([ 'enemy' ]);

export class UnitMovementSystem
{
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
            if (enemy.health <= 0 || enemy.isPreview || enemy.isNexus)
            {
                continue;
            }

            this.moveEnemy(enemy);
        }
    }

    clearEnemy (_enemyId: string): void {}

    clearTower (_towerId: string): void {}

    clearAll (): void {}

    tileAt (position: WorldPosition): GridPosition | null
    {
        return this.grid.toGrid(position.x, position.y);
    }

    private moveEnemy (enemy: EnemyState): void
    {
        const speed = enemy.stats.moveSpeedPerTick;

        if (speed <= 0)
        {
            return;
        }

        const tower = this.findNearestTower(enemy);
        const goal = tower
            ? tower.position
            : tileCenterWorld(this.grid.config, {
                col: Math.floor(this.grid.config.cols / 2),
                row: this.grid.config.rows - 1,
            });
        const rangePx = rangeTilesToPixels(this.grid, enemy.stats.range);

        if (tower && isWithinAttackRange(enemy, tower, rangePx))
        {
            return;
        }

        const preferred = stepTowardWorldTarget(enemy.position, goal, speed);
        const moved = tryLateralMove(
            this.collision,
            enemy.id,
            enemy.position,
            preferred,
            speed,
            { ignoreKinds: IGNORE_ENEMY_COLLISION },
        );

        if (moved)
        {
            enemy.position = moved;
        }
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
}
