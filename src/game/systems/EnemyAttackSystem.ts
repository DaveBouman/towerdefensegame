import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { EnemyAttackPayload } from '../domain/types';
import { EventBus } from '../EventBus';
import { attacksPerSecondToIntervalTicks } from '../config/gameClockConfig';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import { isWithinAttackRange } from '../combat/combatRange';
import { worldDistance } from '../grid/worldPosition';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { KillRewardSystem } from './KillRewardSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

export class EnemyAttackSystem
{
    private readonly lastAttackTick = new Map<string, number>();

    constructor (
        private readonly enemies: EnemySpawnSystem,
        private readonly towers: TowerPlacementSystem,
        private readonly grid: Grid,
        private readonly killRewards: KillRewardSystem,
    ) {}

    tick (gameTick: number): void
    {
        for (const enemy of this.enemies.all)
        {
            if (enemy.health <= 0 || enemy.isPreview)
            {
                continue;
            }

            this.tryAttack(enemy, gameTick);
        }
    }

    private tryAttack (enemy: EnemyState, gameTick: number): void
    {
        const lastAttack = this.lastAttackTick.get(enemy.id) ?? 0;

        const interval = attacksPerSecondToIntervalTicks(enemy.stats.attacksPerSecond);

        if (gameTick - lastAttack < interval)
        {
            return;
        }

        const target = this.findTarget(enemy);

        if (!target)
        {
            return;
        }

        const damage = target.applyDamage(enemy.stats.attackDamage);

        this.lastAttackTick.set(enemy.id, gameTick);

        const payload: EnemyAttackPayload = {
            enemyId: enemy.id,
            towerId: target.id,
            enemyPosition: { ...enemy.position },
            towerPosition: { ...target.position },
            damage,
            towerHealth: target.health,
        };

        EventBus.emit(GAME_EVENTS.ENEMY_ATTACKED, payload);
        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, target.snapshot());

        if (target.health <= 0)
        {
            this.killRewards.onTowerKilled(enemy, target);
            EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, enemy.snapshot());
            this.towers.remove(target.id);
        }
    }

    private findTarget (enemy: EnemyState): TowerState | null
    {
        const rangePx = this.grid.rangeToPixels(enemy.stats.range);
        let closest: TowerState | null = null;
        let closestDistance = Infinity;

        for (const tower of this.towers.all)
        {
            if (tower.health <= 0)
            {
                continue;
            }

            if (!isWithinAttackRange(enemy, tower, rangePx))
            {
                continue;
            }

            const distance = worldDistance(enemy.position, tower.position);

            if (distance >= closestDistance)
            {
                continue;
            }

            closest = tower;
            closestDistance = distance;
        }

        return closest;
    }

    clearEnemy (enemyId: string): void
    {
        this.lastAttackTick.delete(enemyId);
    }
}
