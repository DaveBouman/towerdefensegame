import { getCardDefinitionOrThrow, type CardDefinition } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';

export const isHazardDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'hazard';

export const isSiphonDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'siphon';

/** Enemy field nodes that convert to attack/defend when routed into the chain. */
export const isConvertibleFieldNode = (definition: CardDefinition): boolean =>
    isHazardDefinition(definition) || isSiphonDefinition(definition);

/**
 * A card that chains into an enemy trap converts that trap to its own kind: the
 * bomb detonates as an attack (dealing the trap's power) after a damage step, or
 * as armor after a defend. Converted bombs then participate in streaks/abilities
 * like the type they became. Runs before stacking so the conversion is fully
 * "that type". Unchained traps still explode (see `computeHazardDamage`).
 */
const convertHazardStep = (
    step: ActivationStep,
    hazardPower: number,
    asDefend: boolean,
): ActivationStep => ({
    ...step,
    behaviorId: asDefend ? 'defend' : 'attack',
    damage: asDefend ? 0 : hazardPower,
    armor: asDefend ? hazardPower : 0,
});

export const applyBombConversion = (chain: ActivationStep[]): ActivationStep[] =>
{
    const converted: ActivationStep[] = [];

    chain.forEach((step, index) =>
    {
        const definition = getCardDefinitionOrThrow(step.definitionId);

        if (!isConvertibleFieldNode(definition))
        {
            converted.push(step);

            return;
        }

        const hazardPower = definition.power;

        // Chain starts on a trap then routes onward — convert from the next card's type.
        if (index === 0 && chain.length > 1)
        {
            const nextBehavior = getCardDefinitionOrThrow(chain[index + 1]!.definitionId).behaviorId;

            converted.push(convertHazardStep(step, hazardPower, nextBehavior === 'defend'));

            return;
        }

        if (index === 0)
        {
            converted.push(step);

            return;
        }

        const previous = converted[index - 1]!;

        converted.push(convertHazardStep(step, hazardPower, previous.behaviorId === 'defend'));
    });

    return converted;
};
