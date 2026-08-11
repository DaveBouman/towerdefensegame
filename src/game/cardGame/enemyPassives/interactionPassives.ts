import { isTrailNeutralBehavior } from '../abilities/chainTrailNeutrals';
import type { EnemyCombatant } from '../domain/types';
import { isCombatantAlive } from '../domain/enemyCombatants';
import { getEnemyPassive } from './defaults';
import type { CardThiefPassiveConfig, SkillJamPassiveConfig } from './types';

export const isSkillChainStep = (behaviorId: string): boolean =>
    isTrailNeutralBehavior(behaviorId);

export const getLivingSkillJam = (
    combatants: readonly EnemyCombatant[],
): SkillJamPassiveConfig | null =>
{
    let maxSuppressed = 0;

    for (const combatant of combatants)
    {
        if (!isCombatantAlive(combatant))
        {
            continue;
        }

        const jam = getEnemyPassive(combatant.definition.passives, 'skillJam');

        if (jam)
        {
            maxSuppressed = Math.max(maxSuppressed, jam.suppressedSkillCards);
        }
    }

    return maxSuppressed > 0
        ? { id: 'skillJam', suppressedSkillCards: maxSuppressed }
        : null;
};

export const resolveBodyguardRedirect = (
    targetInstanceId: string,
    combatants: readonly EnemyCombatant[],
    redirectUsed: boolean,
): { targetInstanceId: string; redirectUsed: boolean } =>
{
    if (redirectUsed)
    {
        return { targetInstanceId, redirectUsed };
    }

    const target = combatants.find((combatant) => combatant.instanceId === targetInstanceId);

    if (!target || !isCombatantAlive(target))
    {
        return { targetInstanceId, redirectUsed };
    }

    for (const guard of combatants)
    {
        if (!isCombatantAlive(guard) || guard.instanceId === targetInstanceId)
        {
            continue;
        }

        const bodyguard = getEnemyPassive(guard.definition.passives, 'bodyguard');

        if (bodyguard?.protectDefinitionId === target.definitionId)
        {
            return { targetInstanceId: guard.instanceId, redirectUsed: true };
        }
    }

    return { targetInstanceId, redirectUsed };
};

export const applyLinkRageToAllies = (
    combatants: readonly EnemyCombatant[],
): void =>
{
    for (const ally of combatants)
    {
        if (!isCombatantAlive(ally))
        {
            continue;
        }

        const linkRage = getEnemyPassive(ally.definition.passives, 'linkRage');

        if (!linkRage)
        {
            continue;
        }

        ally.linkRageAttackBonus = Math.max(
            ally.linkRageAttackBonus ?? 0,
            linkRage.attackBonus,
        );
        ally.pendingExtraTraps = (ally.pendingExtraTraps ?? 0) + linkRage.extraTraps;
    }
};

export const applyRerollTaxToCombatants = (combatants: readonly EnemyCombatant[]): void =>
{
    for (const combatant of combatants)
    {
        if (!isCombatantAlive(combatant))
        {
            continue;
        }

        const tax = getEnemyPassive(combatant.definition.passives, 'rerollTax');

        if (!tax)
        {
            continue;
        }

        combatant.rerollTaxAttackBonus = (combatant.rerollTaxAttackBonus ?? 0) + tax.attackBonus;
        combatant.pendingExtraTraps = (combatant.pendingExtraTraps ?? 0) + tax.extraTraps;
    }
};

export const stealCredFromRun = (
    runGold: number,
    goldStolen: number,
    amount: number,
): { goldStolen: number; stolenThisTurn: number } =>
{
    const remaining = Math.max(0, runGold - goldStolen);
    const stolenThisTurn = Math.min(amount, remaining);

    return {
        goldStolen: goldStolen + stolenThisTurn,
        stolenThisTurn,
    };
};

export const shouldStealCardThisTurn = (
    host: EnemyCombatant,
    passive: CardThiefPassiveConfig,
): boolean =>
    host.turnsTaken === 1 && !host.stolenCardId;

export const shouldFleeThisTurn = (
    host: EnemyCombatant,
    passive: CardThiefPassiveConfig,
): boolean =>
    host.turnsTaken >= passive.fleeAfterTurns;

export const getCardThiefPassive = (
    combatant: EnemyCombatant,
): CardThiefPassiveConfig | null =>
    getEnemyPassive(combatant.definition.passives, 'cardThief');
