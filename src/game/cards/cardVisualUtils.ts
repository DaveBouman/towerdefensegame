import type { CardVisualStyle } from './cardVisuals';
import { CARD_VISUALS } from './cardVisuals';
import { getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';

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
