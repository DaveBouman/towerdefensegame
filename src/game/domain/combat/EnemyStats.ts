import { goldToBonusAttack, goldToBonusMaxHealth } from '../../config/goldScaling';
import type { EnemyPerk } from '../perks/types';
import type { DamageType, EnemyBaseStats, EnemyStatsSnapshot } from './types';

const MAX_RESISTANCE = 0.9;

export class EnemyStats
{
    private readonly resolved: EnemyBaseStats;
    private killGold = 0;

    constructor (
        private readonly base: EnemyBaseStats,
        private readonly perks: readonly EnemyPerk[] = [],
    )
    {
        this.resolved = this.resolveBase();
    }

    get maxHealth (): number
    {
        return this.resolved.maxHealth + goldToBonusMaxHealth(this.killGold);
    }

    get damage (): number
    {
        return this.resolved.damage + goldToBonusAttack(this.killGold);
    }

    get defense (): number
    {
        return this.resolved.defense + this.getArmorBonus();
    }

    get range (): number
    {
        return this.resolved.range;
    }

    get attacksPerSecond (): number
    {
        return this.resolved.attacksPerSecond;
    }

    get moveSpeedPerTick (): number
    {
        return this.resolved.moveSpeedPerTick;
    }

    get goldValue (): number
    {
        return this.resolved.goldValue;
    }

    get accumulatedKillGold (): number
    {
        return this.killGold;
    }

    get perkIds (): string[]
    {
        return this.perks.map((perk) => perk.id);
    }

    addKillReward (gold: number): void
    {
        if (gold <= 0)
        {
            return;
        }

        this.killGold += gold;
    }

    snapshot (): EnemyStatsSnapshot
    {
        const resistances: Partial<Record<DamageType, number>> = {};

        for (const element of [ 'physical', 'fire', 'water', 'earth', 'air' ] as const)
        {
            const value = this.getResistance(element);

            if (value > 0)
            {
                resistances[element] = value;
            }
        }

        return {
            maxHealth: this.maxHealth,
            damage: this.damage,
            defense: this.defense,
            range: this.range,
            attacksPerSecond: this.attacksPerSecond,
            moveSpeedPerTick: this.moveSpeedPerTick,
            goldValue: this.goldValue,
            killGold: this.killGold,
            resistances,
            perkIds: this.perkIds,
        };
    }

    getResistance (element: DamageType): number
    {
        const total = this.perks.reduce((sum, perk) =>
            sum + (perk.getElementResistance?.(element) ?? 0), 0);

        return Math.min(MAX_RESISTANCE, total);
    }

    takeDamage (rawDamage: number, type: DamageType = 'physical'): number
    {
        const afterDefense = Math.max(1, rawDamage - this.defense);
        const multiplier = 1 - this.getResistance(type);

        return Math.max(1, Math.round(afterDefense * multiplier));
    }

    private resolveBase (): EnemyBaseStats
    {
        return this.perks.reduce(
            (stats, perk) => perk.modifyBase?.(stats) ?? stats,
            { ...this.base },
        );
    }

    private getArmorBonus (): number
    {
        return this.perks.reduce((sum, perk) => sum + (perk.getArmorBonus?.() ?? 0), 0);
    }
}
