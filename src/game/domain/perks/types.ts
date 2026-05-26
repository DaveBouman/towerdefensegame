import type { DamageType, EnemyBaseStats } from '../combat/types';

export interface EnemyPerk
{
    readonly id: string;

    modifyBase? (stats: EnemyBaseStats): EnemyBaseStats;

    getArmorBonus? (): number;

    getElementResistance? (element: DamageType): number;
}
