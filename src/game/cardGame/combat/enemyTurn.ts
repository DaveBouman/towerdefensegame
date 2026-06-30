import type { CardGameEnemyDefinition } from '../config/enemyCatalog';
import type { EnemyTurnAction, EnemyTurnStep } from '../domain/types';

const planCombatStep = (enemy: CardGameEnemyDefinition): EnemyTurnStep =>
{
    if (Math.random() < enemy.attackChance)
    {
        return {
            kind: 'attack',
            amount: enemy.attackDamage,
        };
    }

    return {
        kind: 'shield',
        amount: enemy.shieldGain,
    };
};

/** Plans one enemy turn from a card-game enemy definition. */
export const planEnemyTurn = (enemy: CardGameEnemyDefinition): EnemyTurnAction =>
{
    const steps: EnemyTurnStep[] = [ planCombatStep(enemy) ];

    for (let i = 0; i < enemy.hazardsPerTurn; i++)
    {
        steps.push({ kind: 'place-hazard' });
    }

    return {
        enemyId: enemy.id,
        steps,
    };
};

export const getPrimaryCombatStep = (
    action: EnemyTurnAction,
): EnemyTurnStep | undefined =>
    action.steps.find((step) => step.kind === 'attack' || step.kind === 'shield');

export const describeEnemyStep = (
    step: EnemyTurnStep,
    phase: 'upcoming' | 'executing',
): { title: string; color: string } =>
{
    if (step.kind === 'place-hazard')
    {
        return phase === 'executing'
            ? { title: 'Trap', color: '#ff6b6b' }
            : { title: 'Trap', color: '#ff9f43' };
    }

    if (phase === 'executing')
    {
        return step.kind === 'attack'
            ? { title: `Attack ${step.amount}`, color: '#ff7675' }
            : { title: `Shield +${step.amount}`, color: '#aed6f1' };
    }

    return step.kind === 'attack'
        ? { title: `Attack ${step.amount}`, color: '#ff9f43' }
        : { title: `Shield +${step.amount}`, color: '#5dade2' };
};

export const describeEnemyIntent = (
    action: EnemyTurnAction,
    phase: 'upcoming' | 'executing',
): { title: string; color: string } =>
{
    const parts = action.steps.map((step) => describeEnemyStep(step, phase).title);
    const primary = getPrimaryCombatStep(action);
    const prefix = phase === 'executing' ? '' : 'After round: ';
    const suffix = phase === 'executing' ? '!' : '';

    return {
        title: `${prefix}${parts.join(' + ')}${suffix}`,
        color: primary?.kind === 'attack' ? '#ff9f43' : '#5dade2',
    };
};
