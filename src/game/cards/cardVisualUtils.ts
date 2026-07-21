import type { CardDefinition } from '../cardGame/config/cardRegistry';
import { GAME_RULES, getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import type { CardVisualStyle } from './cardVisuals';
import { CARD_VISUALS } from './cardVisuals';

export const colorHex = (value: number): string =>
    `#${value.toString(16).padStart(6, '0')}`;

export const resolveCardVisualStyle = (
    definitionId: string,
    behaviorId?: string,
): CardVisualStyle =>
{
    const definition = getCardDefinitionOrThrow(definitionId);
    const visualKey = definition.visualId ?? definition.behaviorId;

    return CARD_VISUALS[visualKey]
        ?? CARD_VISUALS[behaviorId ?? definition.behaviorId]
        ?? CARD_VISUALS.attack;
};

export const cardVisualCssVars = (style: CardVisualStyle): Record<string, string> => ({
    '--card-fill': colorHex(style.fill),
    '--card-border': colorHex(style.border),
    '--card-label': style.labelColor,
    '--card-power': style.powerColor,
});

/** Shared power/badge text for Phaser cards and React chips. */
export const formatCardPowerLabel = (definition: CardDefinition): string =>
{
    const visualKey = definition.visualId ?? definition.behaviorId;
    const handPenalty = definition.handEndPenalty ?? 0;

    if (definition.behaviorId === 'joker')
    {
        return '★';
    }

    if (definition.behaviorId === 'boost')
    {
        return `×${GAME_RULES.fieldBoost.nextStepMultiplier}`;
    }

    if (definition.behaviorId === 'loop-reset')
    {
        return '↺1';
    }

    if (definition.behaviorId === 'poison')
    {
        return `${definition.power}×→`;
    }

    if (definition.behaviorId === 'fire')
    {
        return `${definition.power}↔`;
    }

    if (definition.behaviorId === 'curse' && handPenalty > 0)
    {
        return `-${handPenalty}`;
    }

    if (visualKey === 'fuse' && handPenalty > 0)
    {
        return `${definition.power}!`;
    }

    return String(definition.power);
};
