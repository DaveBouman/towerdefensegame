import type { EnemyBaseStats } from '../domain/combat/types';
import type { EnemyPerk } from '../domain/perks/types';

export const BASIC_ENEMY_UNIT_TYPE = 'Basic Enemy';

export const BASIC_ENEMY_BASE_STATS: EnemyBaseStats = {
    health: 100,
    attackDamage: 5,
    defense: 2,
    range: 1.25,
    attacksPerSecond: 1,
    moveSpeedPerTick: 12,
    goldValue: 20,
};

export const BASIC_ENEMY_PERKS: EnemyPerk[] = [];
