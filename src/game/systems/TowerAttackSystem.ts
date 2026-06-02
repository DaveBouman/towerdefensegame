import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import type { TowerAttackPayload } from '../domain/types';
import { attacksPerSecondToIntervalTicks } from '../config/gameClockConfig';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import { isPersistentEnemyNexus } from '../combat/enemyNexusPersistence';
import { pickTowerAttackTarget } from '../combat/towerTargeting';
import { isWithinAttackRange } from '../combat/combatRange';
import { applyAreaDamage } from '../combat/areaDamage';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { KillRewardSystem } from './KillRewardSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

export class TowerAttackSystem
{
    private static readonly KAMIKAZE_SKILL = 'kamikaze';
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

        if (this.shouldSelfDestructOnHit(tower))
        {
            this.selfDestructTower(tower);
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

    private shouldSelfDestructOnHit (tower: TowerState): boolean
    {
        return tower.skills.includes(TowerAttackSystem.KAMIKAZE_SKILL);
    }

    private selfDestructTower (tower: TowerState): void
    {
        this.applyTowerExplosion(tower);
        tower.health = 0;
        this.towers.disableTower(tower.id);
        this.lastAttackTick.delete(tower.id);
        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());
    }

    private applyTowerExplosion (tower: TowerState): void
    {
        if (tower.kamikazeExplosionRadiusTiles <= 0)
        {
            return;
        }

        const radiusPx = this.grid.rangeToPixels(tower.kamikazeExplosionRadiusTiles);
        const targets = this.enemies.all.filter((enemy) =>
            enemy.health > 0
            && !enemy.isPreview
            && isWithinAttackRange(tower, enemy, radiusPx));

        applyAreaDamage(targets, (enemy) =>
        {
            enemy.applyDamage(tower.damage);
            const enemyDied = enemy.health <= 0;

            if (enemyDied && isPersistentEnemyNexus(enemy))
            {
                EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, enemy.snapshot());
            }
            else if (enemyDied)
            {
                this.killRewards.onEnemyKilled(enemy);
                this.enemies.remove(enemy.id);
            }
            else
            {
                EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, enemy.snapshot());
            }
        });
    }
}
