import { EventBus } from '../EventBus';
import { attacksPerSecondToIntervalTicks } from '../config/gameClockConfig';
import type { EnemyState } from '../domain/EnemyState';
import type { PlayerNexusState } from '../domain/PlayerNexusState';
import type { TowerState } from '../domain/TowerState';
import type { EnemyAttackPayload, TowerAttackPayload } from '../domain/types';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import { isWithinAttackRange } from '../combat/combatRange';
import { isPersistentEnemyNexus } from '../combat/enemyNexusPersistence';
import { canEnemiesTargetPlayerNexus, livingTowers } from '../combat/targetPriority';
import { pickTowerAttackTarget } from '../combat/towerTargeting';
import { worldDistance } from '../grid/worldPosition';
import { applyAreaDamage } from '../combat/areaDamage';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { KillRewardSystem } from './KillRewardSystem';
import type { PlayerNexusSystem } from './PlayerNexusSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

type AttackUnit = TowerState | EnemyState;

export class UnitAttackSystem
{
    private static readonly KAMIKAZE_SKILL = 'kamikaze';
    private readonly lastAttackTick = new Map<string, number>();

    constructor (
        private readonly towers: TowerPlacementSystem,
        private readonly enemies: EnemySpawnSystem,
        private readonly playerNexus: PlayerNexusSystem,
        private readonly grid: Grid,
        private readonly killRewards: KillRewardSystem,
    ) {}

    tick (gameTick: number): void
    {
        const units: AttackUnit[] = [
            ...this.towers.all.filter((tower) => tower.health > 0),
            ...this.enemies.all.filter((enemy) => enemy.health > 0 && !enemy.isPreview && !enemy.isNexus),
        ];

        for (const unit of units)
        {
            this.tryAttack(unit, gameTick);
        }
    }

    clearUnit (unitId: string): void
    {
        this.lastAttackTick.delete(unitId);
    }

    clearTower (towerId: string): void
    {
        this.clearUnit(towerId);
    }

    clearEnemy (enemyId: string): void
    {
        this.clearUnit(enemyId);
    }

    clearAll (): void
    {
        this.lastAttackTick.clear();
    }

    private tryAttack (unit: AttackUnit, gameTick: number): void
    {
        const attacksPerSecond = this.isTower(unit)
            ? unit.attacksPerSecond
            : unit.stats.attacksPerSecond;
        const interval = attacksPerSecondToIntervalTicks(attacksPerSecond);

        if (interval <= 0)
        {
            return;
        }

        const lastAttack = this.lastAttackTick.get(unit.id) ?? 0;

        if (gameTick - lastAttack < interval)
        {
            return;
        }

        if (this.isTower(unit))
        {
            this.tryTowerAttack(unit, gameTick);
            return;
        }

        this.tryEnemyAttack(unit, gameTick);
    }

    private tryTowerAttack (tower: TowerState, gameTick: number): void
    {
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

        const damage = target.applyDamage(tower.damage, tower.damageType);

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
            this.killRewards.onEnemyKilled(target, tower.id);
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

    private tryEnemyAttack (enemy: EnemyState, gameTick: number): void
    {
        const rangePx = this.grid.rangeToPixels(enemy.stats.range);
        const towerTarget = this.findTowerInRange(enemy, rangePx);

        if (towerTarget)
        {
            const damage = towerTarget.applyDamage(enemy.stats.damage, enemy.stats.damageType);

            this.lastAttackTick.set(enemy.id, gameTick);

            const payload: EnemyAttackPayload = {
                enemyId: enemy.id,
                targetKind: 'tower',
                towerId: towerTarget.id,
                enemyPosition: { ...enemy.position },
                targetPosition: { ...towerTarget.position },
                damage,
                targetHealth: towerTarget.health,
            };

            EventBus.emit(GAME_EVENTS.ENEMY_ATTACKED, payload);
            EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, towerTarget.snapshot());

            if (towerTarget.health <= 0)
            {
                this.killRewards.onTowerKilled(enemy, towerTarget);
                EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, enemy.snapshot());
                this.towers.disableTower(towerTarget.id);
            }

            if (this.shouldSelfDestructOnHit(enemy))
            {
                this.selfDestructEnemy(enemy);
            }

            return;
        }

        const nexus = this.playerNexus.active;

        if (
            nexus
            && nexus.health > 0
            && canEnemiesTargetPlayerNexus(this.towers.all)
            && isWithinAttackRange(enemy, nexus, rangePx)
        )
        {
            const damage = this.playerNexus.applyDamage(enemy.stats.damage);
            this.lastAttackTick.set(enemy.id, gameTick);

            const payload: EnemyAttackPayload = {
                enemyId: enemy.id,
                targetKind: 'playerNexus',
                enemyPosition: { ...enemy.position },
                targetPosition: { ...nexus.position },
                damage,
                targetHealth: nexus.health,
            };

            EventBus.emit(GAME_EVENTS.ENEMY_ATTACKED, payload);

            if (this.shouldSelfDestructOnHit(enemy))
            {
                this.selfDestructEnemy(enemy);
            }
        }
    }

    private findTowerInRange (enemy: EnemyState, rangePx: number): TowerState | null
    {
        let closest: TowerState | null = null;
        let closestDistance = Infinity;

        for (const tower of livingTowers(this.towers.all))
        {
            if (!isWithinAttackRange(enemy, tower, rangePx))
            {
                continue;
            }

            const distance = worldDistance(enemy.position, tower.position);

            if (distance < closestDistance)
            {
                closest = tower;
                closestDistance = distance;
            }
        }

        return closest;
    }

    private shouldSelfDestructOnHit (unit: AttackUnit): boolean
    {
        return unit.skills.includes(UnitAttackSystem.KAMIKAZE_SKILL);
    }

    private selfDestructEnemy (enemy: EnemyState): void
    {
        this.applyEnemyExplosion(enemy);
        enemy.health = 0;
        EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, enemy.snapshot());
        this.enemies.remove(enemy.id);
        this.lastAttackTick.delete(enemy.id);
    }

    private selfDestructTower (tower: TowerState): void
    {
        this.applyTowerExplosion(tower);
        tower.health = 0;
        this.towers.disableTower(tower.id);
        this.lastAttackTick.delete(tower.id);
        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());
    }

    private applyEnemyExplosion (enemy: EnemyState): void
    {
        if (enemy.kamikazeExplosionRadiusTiles <= 0)
        {
            return;
        }

        const radiusPx = this.grid.rangeToPixels(enemy.kamikazeExplosionRadiusTiles);
        const targets = livingTowers(this.towers.all).filter((tower) =>
            isWithinAttackRange(enemy, tower, radiusPx));

        applyAreaDamage(targets, (tower) =>
        {
            const damage = tower.applyDamage(enemy.stats.damage, enemy.stats.damageType);

            EventBus.emit(GAME_EVENTS.TOWER_COMBAT_DAMAGE, { towerId: tower.id, taken: damage });
            EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());

            if (tower.health <= 0)
            {
                this.killRewards.onTowerKilled(enemy, tower);
                this.towers.disableTower(tower.id);
            }
        });

        const nexus = this.playerNexus.active;

        if (nexus && nexus.health > 0 && isWithinAttackRange(enemy, nexus, radiusPx))
        {
            this.playerNexus.applyDamage(enemy.stats.damage);
        }
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
            const damage = enemy.applyDamage(tower.damage);

            EventBus.emit(GAME_EVENTS.TOWER_COMBAT_DAMAGE, { towerId: tower.id, dealt: damage });
            const enemyDied = enemy.health <= 0;

            if (enemyDied && isPersistentEnemyNexus(enemy))
            {
                EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, enemy.snapshot());
            }
            else if (enemyDied)
            {
                this.killRewards.onEnemyKilled(enemy, tower.id);
                this.enemies.remove(enemy.id);
            }
            else
            {
                EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, enemy.snapshot());
            }
        });
    }

    private isTower (unit: AttackUnit): unit is TowerState
    {
        return unit.side === 'player';
    }
}

