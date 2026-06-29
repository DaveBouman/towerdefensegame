import { EventBus } from '../EventBus';
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
    ) {}

    onEnemyKilled (enemy: EnemyState, _killerTowerId?: string): void
    {
        if (!enemy.isNexus && !enemy.isPreview)
        {
            this.state.addGold(enemy.stats.goldValue);
        }
    }

    onTowerKilled (_enemy: EnemyState, _tower: TowerState): void
    {
        // Towers are removed when disabled; no extra rewards in the basic shell.
    }
}
