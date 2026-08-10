import type { BattleModifier } from '../cardGame/combat/battleModifiers';

/** Run-wide rule tweak applied for the whole run (ascension tiers, mutators, etc.). */
export interface RunModifierDefinition {
    id: string;
    label: string;
    description: string;
    /** Percentage battle modifiers seeded at the start of each fight. */
    battleModifiers?: readonly Pick<BattleModifier, 'stat' | 'delta'>[];
}

/** Registry of selectable run modifiers — ascension picks from here. */
export const RUN_MODIFIER_DEFINITIONS: Record<string, RunModifierDefinition> = {
    // Example ascension hooks (not wired to UI yet):
    // 'ascension-enemy-fury': {
    //     id: 'ascension-enemy-fury',
    //     label: 'Enemy Fury',
    //     description: 'Enemies begin each fight with +10% attack.',
    //     battleModifiers: [ { stat: 'enemy-attack', delta: 0.1 } ],
    // },
};

export const getRunModifierDefinition = (id: string): RunModifierDefinition | undefined =>
    RUN_MODIFIER_DEFINITIONS[id];

/** Collect battle modifiers granted by active run modifiers. */
export const collectRunModifierBattleModifiers = (
    runModifierIds: readonly string[],
): Pick<BattleModifier, 'stat' | 'delta'>[] =>
{
    const presets: Pick<BattleModifier, 'stat' | 'delta'>[] = [];

    for (const id of runModifierIds)
    {
        const definition = RUN_MODIFIER_DEFINITIONS[id];

        if (!definition?.battleModifiers)
        {
            continue;
        }

        presets.push(...definition.battleModifiers);
    }

    return presets;
};
