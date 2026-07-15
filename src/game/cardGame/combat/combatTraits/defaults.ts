import type {
    CombatTraitConfig,
    CombatTraitId,
    CombatTraitInput,
} from './types';

export const COMBAT_TRAIT_DEFAULTS: Record<CombatTraitId, CombatTraitConfig> = {
    damageCap: { id: 'damageCap', maxPerCard: 5 },
    hitWard: { id: 'hitWard', hitsBlocked: 3 },
};

export const normalizeCombatTraits = (
    traits: readonly CombatTraitInput[] = [],
): CombatTraitConfig[] =>
    traits.map((trait) =>
    {
        if (typeof trait === 'string')
        {
            return { ...COMBAT_TRAIT_DEFAULTS[trait] };
        }

        return {
            ...COMBAT_TRAIT_DEFAULTS[trait.id],
            ...trait,
        } as CombatTraitConfig;
    });

export const getCombatTrait = <T extends CombatTraitConfig['id']>(
    traits: readonly CombatTraitConfig[],
    id: T,
): Extract<CombatTraitConfig, { id: T }> | undefined =>
    traits.find((trait): trait is Extract<CombatTraitConfig, { id: T }> => trait.id === id);

/** Merges trait lists; later entries override earlier ones with the same id. */
export const mergeCombatTraits = (
    ...lists: readonly (readonly CombatTraitConfig[])[]
): CombatTraitConfig[] =>
{
    const merged = new Map<CombatTraitId, CombatTraitConfig>();

    for (const list of lists)
    {
        for (const trait of list)
        {
            merged.set(trait.id, trait);
        }
    }

    return [ ...merged.values() ];
};
