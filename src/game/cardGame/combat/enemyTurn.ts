import { GAME_RULES } from '../config/cardRegistry';
import type { EnemyTurnAction } from '../domain/types';

/** Enemy attacks, gains shield, or places a trap on the board. */
export const planEnemyTurn = (): EnemyTurnAction =>
{
    const { attack, shield, placeHazard } = GAME_RULES.enemyTurnWeights;
    const roll = Math.random();

    if (roll < attack)
    {
        return {
            kind: 'attack',
            amount: GAME_RULES.enemy.attackDamage,
        };
    }

    if (roll < attack + shield)
    {
        return {
            kind: 'shield',
            amount: GAME_RULES.enemy.shieldGain,
        };
    }

    return { kind: 'place-hazard' };
};

export const describeEnemyIntent = (
    action: EnemyTurnAction,
    phase: 'upcoming' | 'executing',
): { title: string; color: string } =>
{
    if (action.kind === 'place-hazard')
    {
        return phase === 'executing'
            ? { title: 'Placing trap!', color: '#ff6b6b' }
            : { title: 'After round: Place trap', color: '#ff9f43' };
    }

    if (phase === 'executing')
    {
        return action.kind === 'attack'
            ? { title: `Attacking ${action.amount}!`, color: '#ff7675' }
            : { title: `Shield +${action.amount}!`, color: '#aed6f1' };
    }

    return action.kind === 'attack'
        ? { title: `After round: Attack ${action.amount}`, color: '#ff9f43' }
        : { title: `After round: Shield +${action.amount}`, color: '#5dade2' };
};
