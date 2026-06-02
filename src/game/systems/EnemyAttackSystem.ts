import type { EnemyState } from '../domain/EnemyState';
import type { PlayerNexusState } from '../domain/PlayerNexusState';
import type { TowerState } from '../domain/TowerState';
import type { EnemyAttackPayload } from '../domain/types';
import { EventBus } from '../EventBus';
import { attacksPerSecondToIntervalTicks } from '../config/gameClockConfig';
import { canEnemiesTargetPlayerNexus, livingTowers } from '../combat/targetPriority';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import { rangeTilesToPixels } from '../grid/rangePixels';
import { isWithinAttackRange } from '../combat/combatRange';
import { worldDistance } from '../grid/worldPosition';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { KillRewardSystem } from './KillRewardSystem';
import type { PlayerNexusSystem } from './PlayerNexusSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

export class EnemyAttackSystem
{
    private readonly lastAttackTick = new Map<string, number>();

    constructor (
        private readonly enemies: EnemySpawnSystem,
        private readonly towers: TowerPlacementSystem,
        private readonly playerNexus: PlayerNexusSystem,
        private readonly grid: Grid,
        private readonly killRewards: KillRewardSystem,
    ) {}

    tick (gameTick: number): void
    {
        for (const enemy of this.enemies.all)
        {
            if (enemy.health <= 0 || enemy.isPreview || enemy.isNexus)
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

        const rangePx = rangeTilesToPixels(this.grid, enemy.stats.range);
        const towerTarget = this.findTowerInRange(enemy, rangePx);

        if (towerTarget)
        {
            this.attackTower(enemy, towerTarget, gameTick);

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
            this.attackPlayerNexus(enemy, nexus, gameTick);
        }
    }

    private attackTower (enemy: EnemyState, target: TowerState, gameTick: number): void
    {
        const damage = target.applyDamage(enemy.stats.damage);

        this.lastAttackTick.set(enemy.id, gameTick);

        const payload: EnemyAttackPayload = {
            enemyId: enemy.id,
            targetKind: 'tower',
            towerId: target.id,
            enemyPosition: { ...enemy.position },
            targetPosition: { ...target.position },
            damage,
            targetHealth: target.health,
        };

        EventBus.emit(GAME_EVENTS.ENEMY_ATTACKED, payload);
        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, target.snapshot());

        if (target.health <= 0)
        {
            this.killRewards.onTowerKilled(enemy, target);
            EventBus.emit(GAME_EVENTS.ENEMY_DAMAGED, enemy.snapshot());
            this.towers.disableTower(target.id);
        }
    }

    private attackPlayerNexus (
        enemy: EnemyState,
        target: PlayerNexusState,
        gameTick: number,
    ): void
    {
        const damage = this.playerNexus.applyDamage(enemy.stats.damage);

        this.lastAttackTick.set(enemy.id, gameTick);

        const payload: EnemyAttackPayload = {
            enemyId: enemy.id,
            targetKind: 'playerNexus',
            enemyPosition: { ...enemy.position },
            targetPosition: { ...target.position },
            damage,
            targetHealth: target.health,
        };

        EventBus.emit(GAME_EVENTS.ENEMY_ATTACKED, payload);
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

    clearEnemy (enemyId: string): void
    {
        this.lastAttackTick.delete(enemyId);
    }
}
