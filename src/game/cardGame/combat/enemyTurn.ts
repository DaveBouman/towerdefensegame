import { GAME_RULES } from '../config/cardRegistry';
import type { EnemyTurnAction } from '../domain/types';

/** Enemy either attacks the player or gains shield for the next player round. */
export const planEnemyTurn = (): EnemyTurnAction =>
{
    if (Math.random() < 0.5)
    {
        return {
            kind: 'attack',
            amount: GAME_RULES.enemy.attackDamage,
        };
    }

    return {
        kind: 'shield',
        amount: GAME_RULES.enemy.shieldGain,
    };
};

export const describeEnemyIntent = (
    action: EnemyTurnAction,
    phase: 'upcoming' | 'executing',
): { title: string; color: string } =>
{
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
