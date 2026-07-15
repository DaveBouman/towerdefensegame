import type { LoadedCardGameEnemyDefinition } from '../../config/enemyCatalog';
import { getBodyModDefinition } from '../../../run/bodyMods';
import { mergeCombatTraits, normalizeCombatTraits } from './defaults';
import type { CombatTraitConfig } from './types';

export const getEnemyCombatTraits = (
    definition: LoadedCardGameEnemyDefinition,
): CombatTraitConfig[] =>
    normalizeCombatTraits(definition.combatTraits ?? []);

export const collectCombatTraitsFromBodyMods = (
    bodyModIds: readonly string[],
): CombatTraitConfig[] =>
{
    const lists: CombatTraitConfig[][] = [];

    for (const bodyModId of bodyModIds)
    {
        const definition = getBodyModDefinition(bodyModId);

        if (definition?.combatTraits?.length)
        {
            lists.push(normalizeCombatTraits(definition.combatTraits));
        }
    }

    return mergeCombatTraits(...lists);
};
