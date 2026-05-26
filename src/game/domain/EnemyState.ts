import type { WorldPosition } from '../grid/types';
import type { DamageType } from './combat/types';
import { EnemyStats } from './combat/EnemyStats';
import type { EnemyPerk } from './perks/types';
import type { EnemyBaseStats } from './combat/types';
import type { EnemyStateSnapshot } from './types';

let nextEnemyId = 0;

export class EnemyState
{
    readonly id: string;
    readonly unitType: string;
    readonly stats: EnemyStats;
    readonly bodyHalfWidth: number;
    readonly bodyHalfHeight: number;
    position: WorldPosition;
    health: number;

    constructor (
        position: WorldPosition,
        unitType: string,
        baseStats: EnemyBaseStats,
        bodyHalfWidth: number,
        bodyHalfHeight: number,
        perks: readonly EnemyPerk[] = [],
    )
    {
        this.id = `enemy-${nextEnemyId++}`;
        this.unitType = unitType;
        this.position = { ...position };
        this.bodyHalfWidth = bodyHalfWidth;
        this.bodyHalfHeight = bodyHalfHeight;
        this.stats = new EnemyStats(baseStats, perks);
        this.health = this.stats.maxHealth;
    }

    get maxHealth (): number
    {
        return this.stats.maxHealth;
    }

    applyDamage (rawDamage: number, type: DamageType = 'physical'): number
    {
        const damage = this.stats.takeDamage(rawDamage, type);

        this.health = Math.max(0, this.health - damage);

        return damage;
    }

    applyKillReward (gold: number): void
    {
        const previousMaxHealth = this.stats.maxHealth;

        this.stats.addKillReward(gold);

        const maxHealthGain = this.stats.maxHealth - previousMaxHealth;

        this.health = Math.min(this.health + maxHealthGain, this.stats.maxHealth);
    }

    tick (_gameTick: number): void
    {
        // Override in subclasses when enemies move or act.
    }

    snapshot (): EnemyStateSnapshot
    {
        return {
            id: this.id,
            position: { ...this.position },
            unitType: this.unitType,
            health: this.health,
            stats: this.stats.snapshot(),
        };
    }
}
