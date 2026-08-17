import { GAME_RULES } from '../config/cardRegistry';

/** Fight-long enemy attack bonus that stacks after each enemy response. */
export class EnemyOverclockTracker
{
    private stacks = 0;

    constructor (private readonly disabled = false)
    {}

    getStacks (): number
    {
        return this.stacks;
    }

    getPerTurn (): number
    {
        if (this.disabled)
        {
            return 0;
        }

        return Math.max(0, GAME_RULES.enemyStrengthPerTurn ?? 0);
    }

    getBonus (): number
    {
        return this.stacks * this.getPerTurn();
    }

    getNextBonus (): number
    {
        return this.getBonus() + this.getPerTurn();
    }

    tick (): void
    {
        if (this.disabled)
        {
            return;
        }

        this.stacks += 1;
    }

    reset (): void
    {
        this.stacks = 0;
    }
}

/** Intra-round ramp: first attack baseline, each extra attack adds perAttack. */
export const getEnemyDamageRamp = (attacksThisRound: number): number =>
{
    const perAttack = Math.max(0, GAME_RULES.enemyDamageRampPerAttack ?? 0);

    return Math.max(0, attacksThisRound - 1) * perAttack;
};
