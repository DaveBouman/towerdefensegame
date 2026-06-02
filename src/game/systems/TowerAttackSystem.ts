import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { TowerAttackPayload } from '../domain/types';
import { attacksPerSecondToIntervalTicks } from '../config/gameClockConfig';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import { isPersistentEnemyNexus } from '../combat/enemyNexusPersistence';
import { pickTowerAttackTarget } from '../combat/towerTargeting';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { KillRewardSystem } from './KillRewardSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

export class TowerAttackSystem
{
    private readonly lastAttackTick = new Map<string, number>();

    constructor (
        private readonly towers: TowerPlacementSystem,
        private readonly enemies: EnemySpawnSystem,
        private readonly grid: Grid,
        private readonly killRewards: KillRewardSystem,
    ) {}

    tick (gameTick: number): void
    {
        for (const tower of this.towers.all)
        {
            if (tower.health <= 0)
            {
                continue;
            }

            this.tryAttack(tower, gameTick);
        }
    }

    private tryAttack (tower: TowerState, gameTick: number): void
    {
        const interval = attacksPerSecondToIntervalTicks(tower.attacksPerSecond);

        if (interval <= 0)
        {
            return;
        }

        const lastAttack = this.lastAttackTick.get(tower.id) ?? 0;

        if (gameTick - lastAttack < interval)
        {
            return;
        }

        const rangePx = this.grid.rangeToPixels(tower.range);
        const target = pickTowerAttackTarget(
            tower.targetingMode,
            tower,
            this.enemies.attackableByTowers,
            rangePx,
        );

        if (!target)
        {
            return;
        }

        const damage = target.applyDamage(tower.damage);

        this.lastAttackTick.set(tower.id, gameTick);

        const enemyDied = target.health <= 0;

        const payload: TowerAttackPayload = {
            towerId: tower.id,
            enemyId: target.id,
            towerPosition: { ...tower.position },
            enemyPosition: { ...target.position },
            damage,
            enemyHealth: target.health,
            enemyDied,
        };

        EventBus.emit(GAME_EVENTS.TOWER_ATTACKED, payload);

        if (enemyDied && isPersistentEnemyNexus(target))
        {
            EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, target.snapshot());
        }
        else if (enemyDied)
        {
            this.killRewards.onEnemyKilled(target);
            this.enemies.remove(target.id);
        }
        else
        {
            EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, target.snapshot());
        }
    }

    clearTower (towerId: string): void
    {
        this.lastAttackTick.delete(towerId);
    }

    clearAll (): void
    {
        this.lastAttackTick.clear();
    }
}
