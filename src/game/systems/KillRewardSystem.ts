import { EventBus } from '../EventBus';
import { getKillExperience } from '../config/towerExperienceConfig';
import { GAME_EVENTS } from '../events/gameEvents';
import type { EnemyState } from '../domain/EnemyState';
import type { GameState } from '../domain/GameState';
import type { TowerState } from '../domain/TowerState';
import type { TowerPlacementSystem } from './TowerPlacementSystem';

export class KillRewardSystem
{
    constructor (
        private readonly state: GameState,
        private readonly towers: TowerPlacementSystem,
        private readonly getCurrentWave: () => number,
    ) {}

    onEnemyKilled (enemy: EnemyState, killerTowerId?: string): void
    {
        if (!enemy.isNexus && !enemy.isPreview)
        {
            this.state.addGold(enemy.stats.goldValue);
        }

        if (!killerTowerId || enemy.isNexus || enemy.isPreview)
        {
            return;
        }

        const tower = this.towers.all.find((t) => t.id === killerTowerId);

        if (!tower)
        {
            return;
        }

        const exp = getKillExperience(enemy.stats.goldValue, this.getCurrentWave());

        tower.recordKill(exp);
        EventBus.emit(GAME_EVENTS.TOWER_KILL_EXP, { towerId: tower.id, exp });
        EventBus.emit(GAME_EVENTS.TOWER_UPDATED, tower.snapshot());
    }

    onTowerKilled (enemy: EnemyState, tower: TowerState): void
    {
        enemy.applyKillReward(tower.goldValue);
    }
}
