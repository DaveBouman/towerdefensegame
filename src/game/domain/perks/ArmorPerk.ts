import type { EnemyPerk } from './types';

export class ArmorPerk implements EnemyPerk
{
    readonly id: string;

    constructor (
        private readonly bonus: number,
        id = `armor-${bonus}`,
    )
    {
        this.id = id;
    }

    getArmorBonus (): number
    {
        return this.bonus;
    }
}
