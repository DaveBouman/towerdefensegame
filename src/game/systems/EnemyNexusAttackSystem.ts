import type { EnemyState } from '../domain/EnemyState';
import type { PlayerNexusState } from '../domain/PlayerNexusState';
import type { TowerState } from '../domain/TowerState';
import type { EnemyNexusAttackPayload } from '../domain/types';
import { EventBus } from '../EventBus';
import { attacksPerSecondToIntervalTicks } from '../config/gameClockConfig';
import { canEnemiesTargetPlayerNexus, livingTowers } from '../combat/targetPriority';
import { isWithinAttackRange } from '../combat/combatRange';
import { worldDistance } from '../grid/worldPosition';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import { getNexusDamageForWave } from '../config/nexusCombatScaling';
import { rangeTilesToPixels } from '../grid/rangePixels';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { KillRewardSystem } from './KillRewardSystem';
import type { PlayerNexusSystem } from './PlayerNexusSystem';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

export class EnemyNexusAttackSystem
{
    private lastAttackTick = 0;

    constructor (
        private readonly enemies: EnemySpawnSystem,
        private readonly towers: TowerPlacementSystem,
        private readonly playerNexus: PlayerNexusSystem,
        private readonly grid: Grid,
        private readonly killRewards: KillRewardSystem,
        private readonly getCurrentWave: () => number,
    ) {}

    private nexusDamage (): number
    {
        return getNexusDamageForWave(this.getCurrentWave());
    }

    tick (gameTick: number): void
    {
        const nexus = this.enemies.getEnemyNexus();

        if (!nexus || nexus.health <= 0)
        {
            return;
        }

        const interval = attacksPerSecondToIntervalTicks(nexus.stats.attacksPerSecond);

        if (interval <= 0 || gameTick - this.lastAttackTick < interval)
        {
            return;
        }

        const rangePx = rangeTilesToPixels(this.grid, nexus.stats.range);
        const towerTarget = this.findTowerInRange(nexus, rangePx);

        if (towerTarget)
        {
            this.attackTower(nexus, towerTarget, gameTick);

            return;
        }

        const playerNexus = this.playerNexus.active;

        if (
            playerNexus
            && playerNexus.health > 0
            && canEnemiesTargetPlayerNexus(this.towers.all)
            && isWithinAttackRange(nexus, playerNexus, rangePx)
        )
        {
            this.attackPlayerNexus(nexus, playerNexus, gameTick);
        }
    }

    private findTowerInRange (nexus: EnemyState, rangePx: number): TowerState | null
    {
        let closest: TowerState | null = null;
        let closestDistance = Infinity;

        for (const tower of livingTowers(this.towers.all))
        {
            if (!isWithinAttackRange(nexus, tower, rangePx))
            {
                continue;
            }

            const distance = worldDistance(nexus.position, tower.position);

            if (distance < closestDistance)
            {
                closest = tower;
                closestDistance = distance;
            }
        }

        return closest;
    }

    private attackTower (nexus: EnemyState, target: TowerState, gameTick: number): void
    {
        const damage = target.applyDamage(this.nexusDamage());

        this.lastAttackTick = gameTick;

        const payload: EnemyNexusAttackPayload = {
            enemyNexusId: nexus.id,
            targetKind: 'tower',
            towerId: target.id,
            nexusPosition: { ...nexus.position },
            targetPosition: { ...target.position },
            damage,
            targetHealth: target.health,
        };

        EventBus.emit(GAME_EVENTS.ENEMY_NEXUS_ATTACKED, payload);
        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, target.snapshot());

        if (target.health <= 0)
        {
            this.killRewards.onTowerKilled(nexus, target);
            this.towers.remove(target.id);
        }
    }

    private attackPlayerNexus (
        nexus: EnemyState,
        target: PlayerNexusState,
        gameTick: number,
    ): void
    {
        const damage = this.playerNexus.applyDamage(this.nexusDamage());

        this.lastAttackTick = gameTick;

        const payload: EnemyNexusAttackPayload = {
            enemyNexusId: nexus.id,
            targetKind: 'playerNexus',
            nexusPosition: { ...nexus.position },
            targetPosition: { ...target.position },
            damage,
            targetHealth: target.health,
        };

        EventBus.emit(GAME_EVENTS.ENEMY_NEXUS_ATTACKED, payload);
    }
}
