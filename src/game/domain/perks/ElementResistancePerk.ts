import type { DamageType } from '../combat/types';
import type { EnemyPerk } from './types';

export class ElementResistancePerk implements EnemyPerk
{
    readonly id: string;

    constructor (
        private readonly element: DamageType,
        private readonly amount: number,
    )
    {
        this.id = `${element}-resist-${Math.round(amount * 100)}`;
    }

    getElementResistance (element: DamageType): number
    {
        return element === this.element ? this.amount : 0;
    }
}
