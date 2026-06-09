import type { EnemyState } from '../domain/EnemyState';
import type { PlayerNexusState } from '../domain/PlayerNexusState';
import type { EnemyNexusAttackPayload, PlayerNexusAttackPayload } from '../domain/types';
import { EventBus } from '../EventBus';
import { attacksPerSecondToIntervalTicks } from '../config/gameClockConfig';
import { isPersistentEnemyNexus } from '../combat/enemyNexusPersistence';
import {
    canEnemiesTargetPlayerNexus,
    canPlayerNexusTargetEnemyNexus,
    livingMinions,
    livingTowers,
} from '../combat/targetPriority';
import { isWithinAttackRange } from '../combat/combatRange';
import { worldDistance } from '../grid/worldPosition';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import { getEnemyNexusDamageForWave } from '../config/enemyNexusScaling';
import { getNexusDamageForWave } from '../config/nexusCombatScaling';
import { rangeTilesToPixels } from '../grid/rangePixels';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { KillRewardSystem } from './KillRewardSystem';
import type { PlayerNexusSystem } from './PlayerNexusSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

export class UnitNexusAttackSystem
{
    private readonly lastAttackTick = new Map<string, number>();

    constructor (
        private readonly enemies: EnemySpawnSystem,
        private readonly towers: TowerPlacementSystem,
        private readonly playerNexus: PlayerNexusSystem,
        private readonly grid: Grid,
        private readonly killRewards: KillRewardSystem,
        private readonly getCurrentWave: () => number,
    ) {}

    tick (gameTick: number): void
    {
        this.tryEnemyNexusAttack(gameTick);
        this.tryPlayerNexusAttack(gameTick);
    }

    private enemyNexusDamage (): number
    {
        return getEnemyNexusDamageForWave(this.getCurrentWave());
    }

    private playerNexusDamage (): number
    {
        return getNexusDamageForWave(this.getCurrentWave());
    }

    private tryEnemyNexusAttack (gameTick: number): void
    {
        const nexus = this.enemies.getEnemyNexus();

        if (!nexus || nexus.health <= 0)
        {
            return;
        }

        if (!this.canAttackNow(nexus.id, nexus.stats.attacksPerSecond, gameTick))
        {
            return;
        }

        const rangePx = rangeTilesToPixels(this.grid, nexus.stats.range);
        const towerTarget = this.findNearestTowerInRange(nexus, rangePx);

        if (towerTarget)
        {
            const damage = towerTarget.applyDamage(this.enemyNexusDamage());

            this.lastAttackTick.set(nexus.id, gameTick);

            const payload: EnemyNexusAttackPayload = {
                enemyNexusId: nexus.id,
                targetKind: 'tower',
                towerId: towerTarget.id,
                nexusPosition: { ...nexus.position },
                targetPosition: { ...towerTarget.position },
                damage,
                targetHealth: towerTarget.health,
            };

            EventBus.emit(GAME_EVENTS.ENEMY_NEXUS_ATTACKED, payload);
            EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, towerTarget.snapshot());

            if (towerTarget.health <= 0)
            {
                this.killRewards.onTowerKilled(nexus, towerTarget);
                this.towers.disableTower(towerTarget.id);
            }

            return;
        }

        if (!canEnemiesTargetPlayerNexus(this.towers.all))
        {
            return;
        }

        const player = this.playerNexus.active;

        if (!player || player.health <= 0 || !isWithinAttackRange(nexus, player, rangePx))
        {
            return;
        }

        const damage = this.playerNexus.applyDamage(this.enemyNexusDamage());
        this.lastAttackTick.set(nexus.id, gameTick);

        const payload: EnemyNexusAttackPayload = {
            enemyNexusId: nexus.id,
            targetKind: 'playerNexus',
            nexusPosition: { ...nexus.position },
            targetPosition: { ...player.position },
            damage,
            targetHealth: player.health,
        };

        EventBus.emit(GAME_EVENTS.ENEMY_NEXUS_ATTACKED, payload);
    }

    private tryPlayerNexusAttack (gameTick: number): void
    {
        const nexus = this.playerNexus.active;

        if (!nexus || nexus.health <= 0)
        {
            return;
        }

        if (!this.canAttackNow(nexus.id, nexus.attacksPerSecond, gameTick))
        {
            return;
        }

        const rangePx = rangeTilesToPixels(this.grid, nexus.range);
        const minion = this.findNearestMinionInRange(nexus, rangePx);

        if (minion)
        {
            this.attackEnemyFromPlayerNexus(nexus, minion, 'enemy', gameTick);
            return;
        }

        const enemyNexus = this.enemies.getEnemyNexus();

        if (
            enemyNexus
            && enemyNexus.health > 0
            && canPlayerNexusTargetEnemyNexus(this.enemies.all)
            && isWithinAttackRange(nexus, enemyNexus, rangePx)
        )
        {
            this.attackEnemyFromPlayerNexus(nexus, enemyNexus, 'enemyNexus', gameTick);
        }
    }

    private attackEnemyFromPlayerNexus (
        nexus: PlayerNexusState,
        target: EnemyState,
        targetKind: PlayerNexusAttackPayload['targetKind'],
        gameTick: number,
    ): void
    {
        const damage = target.applyDamage(this.playerNexusDamage());
        this.lastAttackTick.set(nexus.id, gameTick);

        const enemyDied = target.health <= 0;
        const payload: PlayerNexusAttackPayload = {
            playerNexusId: nexus.id,
            targetKind,
            enemyId: target.id,
            nexusPosition: { ...nexus.position },
            targetPosition: { ...target.position },
            damage,
            targetHealth: target.health,
            enemyDied,
        };

        EventBus.emit(GAME_EVENTS.PLAYER_NEXUS_ATTACKED, payload);

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

    private canAttackNow (nexusId: string, attacksPerSecond: number, gameTick: number): boolean
    {
        const interval = attacksPerSecondToIntervalTicks(attacksPerSecond);

        if (interval <= 0)
        {
            return false;
        }

        const lastAttack = this.lastAttackTick.get(nexusId) ?? 0;

        return gameTick - lastAttack >= interval;
    }

    private findNearestTowerInRange (enemyNexus: EnemyState, rangePx: number): TowerState | null
    {
        let closest: TowerState | null = null;
        let closestDistance = Infinity;

        for (const tower of livingTowers(this.towers.all))
        {
            if (!isWithinAttackRange(enemyNexus, tower, rangePx))
            {
                continue;
            }

            const distance = worldDistance(enemyNexus.position, tower.position);

            if (distance < closestDistance)
            {
                closest = tower;
                closestDistance = distance;
            }
        }

        return closest;
    }

    private findNearestMinionInRange (playerNexus: PlayerNexusState, rangePx: number): EnemyState | null
    {
        let closest: EnemyState | null = null;
        let closestDistance = Infinity;

        for (const enemy of livingMinions(this.enemies.all))
        {
            if (!isWithinAttackRange(playerNexus, enemy, rangePx))
            {
                continue;
            }

            const distance = worldDistance(playerNexus.position, enemy.position);

            if (distance < closestDistance)
            {
                closest = enemy;
                closestDistance = distance;
            }
        }

        return closest;
    }
}

