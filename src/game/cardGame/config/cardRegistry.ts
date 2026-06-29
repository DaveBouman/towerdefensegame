import cardsData from './cards.json';
import gameRulesData from './gameRules.json';
import type { CardDirection } from '../domain/cardDirections';

export interface CardDefinition {
    id: string;
    label: string;
    power: number;
    behaviorId: string;
    visualId: string;
    arrow: CardDirection;
}

export interface GameRules {
    attackAnimationMs: number;
    enemy: { maxHealth: number };
    activationStart: { row: number; col: number };
    startingHand: string[];
}

const definitions = new Map<string, CardDefinition>(
    cardsData.cards.map((card) => [ card.id, card ]),
);

export const GAME_RULES: GameRules = gameRulesData;

export const getCardDefinition = (id: string): CardDefinition | undefined =>
    definitions.get(id);

export const getCardDefinitionOrThrow = (id: string): CardDefinition =>
{
    const definition = getCardDefinition(id);

    if (!definition)
    {
        throw new Error(`Unknown card definition: ${id}`);
    }

    return definition;
};

export const CARD_DEFINITIONS: readonly CardDefinition[] = cardsData.cards;
