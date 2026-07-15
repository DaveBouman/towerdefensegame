import type { EnemyCombatant } from '../../domain/types';
import { getEnemyCombatTraits } from './collect';
import { getCombatTrait } from './defaults';
import type { CombatTraitConfig } from './types';

export interface CombatHitMitigationResult {
    damage: number;
    blocked: boolean;
}

/** Caps or fully blocks incoming attack damage based on combat traits. */
export const applyCombatHitMitigation = (
    traits: readonly CombatTraitConfig[],
    damage: number,
    hitsBlockedRemaining?: number,
): { result: CombatHitMitigationResult; hitsBlockedRemaining?: number } =>
{
    if (damage <= 0)
    {
        return { result: { damage: 0, blocked: false }, hitsBlockedRemaining };
    }

    const hitWard = getCombatTrait(traits, 'hitWard');

    if (hitWard)
    {
        const remaining = hitsBlockedRemaining ?? hitWard.hitsBlocked;

        if (remaining > 0)
        {
            return {
                result: { damage: 0, blocked: true },
                hitsBlockedRemaining: remaining - 1,
            };
        }
    }

    const damageCap = getCombatTrait(traits, 'damageCap');

    if (damageCap)
    {
        return {
            result: { damage: Math.min(damage, damageCap.maxPerCard), blocked: false },
            hitsBlockedRemaining,
        };
    }

    return { result: { damage, blocked: false }, hitsBlockedRemaining };
};

export const applyEnemyHitMitigation = (
    combatant: EnemyCombatant,
    damage: number,
): CombatHitMitigationResult =>
{
    const traits = getEnemyCombatTraits(combatant.definition);
    const { result, hitsBlockedRemaining } = applyCombatHitMitigation(
        traits,
        damage,
        combatant.hitsBlockedRemaining,
    );

    combatant.hitsBlockedRemaining = hitsBlockedRemaining;

    return result;
};

export const initializeEnemyHitMitigation = (combatant: EnemyCombatant): void =>
{
    const hitWard = getCombatTrait(getEnemyCombatTraits(combatant.definition), 'hitWard');

    if (hitWard)
    {
        combatant.hitsBlockedRemaining = hitWard.hitsBlocked;
    }
};
