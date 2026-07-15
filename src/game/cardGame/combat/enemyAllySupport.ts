import type { LoadedCardGameEnemyDefinition } from '../config/enemyCatalog';
import type { EnemyCombatant, EnemyTurnStep } from '../domain/types';
import { isCombatantAlive } from '../domain/enemyCombatants';
import { random } from '../../random/rng';

export type EnemyAllyTargetRule = 'lowest-health' | 'highest-shield' | 'random-other';

export type EnemyAllyActionKind = 'heal-ally' | 'shield-ally';

export interface EnemyAllyActionDefinition {
    kind: EnemyAllyActionKind;
    amount: number;
    /** 0–1 chance to include when another living ally exists. Defaults to 1. */
    chance?: number;
    target?: EnemyAllyTargetRule;
}

export const pickAllyTarget = (
    actorId: string,
    combatants: readonly EnemyCombatant[],
    rule: EnemyAllyTargetRule = 'lowest-health',
): EnemyCombatant | null =>
{
    const allies = combatants.filter(
        (combatant) => isCombatantAlive(combatant) && combatant.instanceId !== actorId,
    );

    if (allies.length === 0)
    {
        return null;
    }

    if (rule === 'random-other')
    {
        return allies[Math.floor(random() * allies.length)] ?? null;
    }

    if (rule === 'highest-shield')
    {
        return [ ...allies ].sort((a, b) => b.state.shield - a.state.shield)[0] ?? null;
    }

    return [ ...allies ].sort((a, b) =>
    {
        const healthDelta = a.state.health - b.state.health;

        if (healthDelta !== 0)
        {
            return healthDelta;
        }

        return a.state.shield - b.state.shield;
    })[0] ?? null;
};

export const planAllySupportSteps = (
    actor: EnemyCombatant,
    combatants: readonly EnemyCombatant[],
    allyActions: readonly EnemyAllyActionDefinition[] = [],
): EnemyTurnStep[] =>
{
    if (allyActions.length === 0)
    {
        return [];
    }

    const steps: EnemyTurnStep[] = [];

    for (const action of allyActions)
    {
        const chance = action.chance ?? 1;

        if (chance <= 0 || random() >= chance)
        {
            continue;
        }

        const target = pickAllyTarget(
            actor.instanceId,
            combatants,
            action.target ?? 'lowest-health',
        );

        if (!target)
        {
            continue;
        }

        steps.push({
            kind: action.kind,
            amount: action.amount,
            targetInstanceId: target.instanceId,
        });
    }

    return steps;
};

export const mergeAllyStepsIntoTurn = (
    baseSteps: EnemyTurnStep[],
    allySteps: EnemyTurnStep[],
): EnemyTurnStep[] =>
{
    if (allySteps.length === 0)
    {
        return baseSteps;
    }

    const combatIndex = baseSteps.findIndex(
        (step) => step.kind === 'attack' || step.kind === 'shield',
    );
    const insertAt = combatIndex >= 0 ? combatIndex + 1 : 0;

    return [
        ...baseSteps.slice(0, insertAt),
        ...allySteps,
        ...baseSteps.slice(insertAt),
    ];
};

export const getEnemyAllyActions = (
    enemy: LoadedCardGameEnemyDefinition,
): readonly EnemyAllyActionDefinition[] => enemy.allyActions ?? [];
