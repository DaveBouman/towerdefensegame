import type { EnemyBaseStats } from '../combat/types';
import type { EnemyPerk } from './types';

export class StatModifierPerk implements EnemyPerk
{
    readonly id: string;

    constructor (
        id: string,
        private readonly modifiers: Partial<EnemyBaseStats>,
    )
    {
        this.id = id;
    }

    modifyBase (stats: EnemyBaseStats): EnemyBaseStats
    {
        return {
            maxHealth: stats.maxHealth + (this.modifiers.maxHealth ?? 0),
            damage: stats.damage + (this.modifiers.damage ?? 0),
            defense: stats.defense + (this.modifiers.defense ?? 0),
            range: stats.range + (this.modifiers.range ?? 0),
            attacksPerSecond: stats.attacksPerSecond + (this.modifiers.attacksPerSecond ?? 0),
            moveSpeedPerTick: stats.moveSpeedPerTick + (this.modifiers.moveSpeedPerTick ?? 0),
            goldValue: stats.goldValue + (this.modifiers.goldValue ?? 0),
        };
    }
}
