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
    readonly enemyKind: string;
    readonly unitType: string;
    readonly isPreview: boolean;
    readonly stats: EnemyStats;
    readonly bodyHalfWidth: number;
    readonly bodyHalfHeight: number;
    position: WorldPosition;
    health: number;

    constructor (
        position: WorldPosition,
        enemyKind: string,
        unitType: string,
        baseStats: EnemyBaseStats,
        bodyHalfWidth: number,
        bodyHalfHeight: number,
        perks: readonly EnemyPerk[] = [],
        isPreview = false,
    )
    {
        this.id = `enemy-${nextEnemyId++}`;
        this.enemyKind = enemyKind;
        this.unitType = unitType;
        this.isPreview = isPreview;
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
            enemyKind: this.enemyKind,
            position: { ...this.position },
            unitType: this.unitType,
            health: this.health,
            stats: this.stats.snapshot(),
            isPreview: this.isPreview,
        };
    }
}
