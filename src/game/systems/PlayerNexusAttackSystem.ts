import type { EnemyState } from '../domain/EnemyState';
import type { PlayerNexusState } from '../domain/PlayerNexusState';
import type { PlayerNexusAttackPayload } from '../domain/types';
import { EventBus } from '../EventBus';
import { attacksPerSecondToIntervalTicks } from '../config/gameClockConfig';
import { isPersistentEnemyNexus } from '../combat/enemyNexusPersistence';
import {
    canPlayerNexusTargetEnemyNexus,
    livingMinions,
} from '../combat/targetPriority';
import { isWithinAttackRange } from '../combat/combatRange';
import { worldDistance } from '../grid/worldPosition';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import { getNexusDamageForWave } from '../config/nexusCombatScaling';
import { rangeTilesToPixels } from '../grid/rangePixels';
import type { EnemySpawnSystem } from './EnemySpawnSystem';
import type { KillRewardSystem } from './KillRewardSystem';
import type { PlayerNexusSystem } from './PlayerNexusSystem';

export class PlayerNexusAttackSystem
{
    private lastAttackTick = 0;

    constructor (
        private readonly playerNexus: PlayerNexusSystem,
        private readonly enemies: EnemySpawnSystem,
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
        const nexus = this.playerNexus.active;

        if (!nexus || nexus.health <= 0)
        {
            return;
        }

        const interval = attacksPerSecondToIntervalTicks(nexus.attacksPerSecond);

        if (interval <= 0 || gameTick - this.lastAttackTick < interval)
        {
            return;
        }

        const rangePx = rangeTilesToPixels(this.grid, nexus.range);
        const minionTarget = this.findMinionInRange(nexus, rangePx);

        if (minionTarget)
        {
            this.attackEnemy(nexus, minionTarget, 'enemy', gameTick);

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
            this.attackEnemy(nexus, enemyNexus, 'enemyNexus', gameTick);
        }
    }

    private findMinionInRange (
        nexus: PlayerNexusState,
        rangePx: number,
    ): EnemyState | null
    {
        let closest: EnemyState | null = null;
        let closestDistance = Infinity;

        for (const enemy of livingMinions(this.enemies.all))
        {
            if (!isWithinAttackRange(nexus, enemy, rangePx))
            {
                continue;
            }

            const distance = worldDistance(nexus.position, enemy.position);

            if (distance < closestDistance)
            {
                closest = enemy;
                closestDistance = distance;
            }
        }

        return closest;
    }

    private attackEnemy (
        nexus: PlayerNexusState,
        target: EnemyState,
        targetKind: PlayerNexusAttackPayload['targetKind'],
        gameTick: number,
    ): void
    {
        const damage = target.applyDamage(this.nexusDamage());

        this.lastAttackTick = gameTick;

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
}
