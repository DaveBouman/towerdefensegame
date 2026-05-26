import type { EnemyState } from '../domain/EnemyState';
import type { GameState } from '../domain/GameState';
import type { TowerState } from '../domain/TowerState';

export class KillRewardSystem
{
    constructor (private readonly state: GameState) {}

    onEnemyKilled (enemy: EnemyState): void
    {
        this.state.addGold(enemy.stats.goldValue);
    }

    onTowerKilled (enemy: EnemyState, tower: TowerState): void
    {
        enemy.applyKillReward(tower.goldValue);
    }
}
