import cardsData from './cards.json';
import gameRulesData from './gameRules.json';

import type { ArrowPool } from '../domain/cardDirections';
import type { CardTooltipOverride } from '../presentation/tooltips/types';

export interface CardDefinition {
    id: string;
    label: string;
    power: number;
    behaviorId: string;
    visualId: string;
    arrowPool: ArrowPool;
    /** How many times this card can activate when the chain revisits its slot. */
    maxChainActivations?: number;
    /** How many grid steps the chain advances along this card's arrow. */
    chainStepDistance?: number;
    /**
     * When true, the chain does not continue straight: it steps one tile along the
     * arrow, then hooks 90° to a forward-diagonal tile (whichever side has a card).
     */
    cornerTurn?: boolean;
    /** Chain abilities resolved after the full activation chain is known. */
    chainAbilityIds?: string[];
    /** Optional tooltip provider id — defaults to card id, then behavior id. */
    tooltipProviderId?: string;
    /** Optional static tooltip lines merged over the resolved provider copy. */
    tooltip?: CardTooltipOverride;
    /** When true the card cannot be dragged from hand onto the board. */
    unplayable?: boolean;
    /** Damage dealt to the player for each copy still in hand when the turn ends. */
    handEndPenalty?: number;
    /** After this card is played from hand, auto-place up to this many other hand cards. */
    deployFromHandOnPlay?: number;
}

export interface GameRules {
    activationStepMs: number;
    enemyTurnMs: number;
    deckSize: number;
    handSize: number;
    energyPerTurn: number;
    enemyDamageRampPerAttack: number;
    fightRerollsPerFight: number;
    player: { maxHealth: number };
    defaultEnemyId: string;
    offChainBonus: { attackDamage: number; defendArmor: number };
    hazard: { definitionId: string };
    typeStackBonus: { perDuplicate: number };
    fieldBoost: { definitionId: string; nextStepMultiplier: number };
    activationStart: { row: number; col: number };
    activationStartColumn: number;
    maxChainSteps: number;
    chainAbilities: {
        poisonTrail: { damagePerSubsequentCard: number };
        fireAlternation: { bonusDamagePerAlternatingStep: number };
        bleed: { attackThreshold: number; bonusPerExtraAttack: number };
        fortify: { defendThreshold: number; armorPerExtraDefend: number };
        overload: { damagePerAbilityCard: number };
    };
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

export const getChainStepDistance = (definition: CardDefinition): number =>
    Math.max(1, definition.chainStepDistance ?? 1);

export const isCardUnplayable = (definition: CardDefinition): boolean =>
    definition.unplayable === true;

export const getCardHandEndPenalty = (definition: CardDefinition): number =>
    Math.max(0, definition.handEndPenalty ?? 0);

export const getCardDeployFromHandCount = (definition: CardDefinition): number =>
    Math.max(0, definition.deployFromHandOnPlay ?? 0);
