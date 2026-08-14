import { cardLabel } from '../../copy/strings';
import cardsData from './cards.json';
import gameRulesData from './gameRules.json';

import type { ArrowPool } from '../domain/cardDirections';
import type { CardTooltipOverride } from '../presentation/tooltips/types';

export type CardTier = 1 | 2 | 3;

export interface CardDefinition {
    id: string;
    label: string;
    power: number;
    behaviorId: string;
    visualId: string;
    arrowPool: ArrowPool;
    /** Reward / offer rarity. 1 common → 3 rare. */
    tier: CardTier;
    /** Id of the upgraded form (`attack-plus`), if this card can be upgraded. */
    upgradesTo?: string;
    /** Base card id when this definition is an upgraded form. */
    upgradeOf?: string;
    /** How many times this card can activate when the chain revisits its slot. */
    maxChainActivations?: number;
    /** How many grid steps the chain advances along this card's arrow. */
    chainStepDistance?: number;
    /**
     * When true, the chain does not continue straight: it steps one tile along the
     * arrow, then hooks 90° to a forward-diagonal tile (whichever side has a card).
     */
    cornerTurn?: boolean;
    /** When true, the chain wraps to the opposite edge instead of stopping off-board. */
    wrapEdges?: boolean;
    /** Chain abilities resolved after the full activation chain is known. */
    chainAbilityIds?: string[];
    /** Optional tooltip provider id — defaults to card id, then behavior id. */
    tooltipProviderId?: string;
    /** Optional static tooltip lines merged over the resolved provider copy. */
    tooltip?: CardTooltipOverride;
    /** When true the card cannot be dragged from hand onto the board. */
    unplayable?: boolean;
    /** When true the card cannot be selected for a hand reroll. */
    nonRerollable?: boolean;
    /** Damage dealt to the player for each copy still in hand when the turn ends. */
    handEndPenalty?: number;
    /** After this card is played from hand, discard up to this many cards from the left of hand. */
    discardFromHandOnPlay?: number;
    /** When true, the card is destroyed for this battle only (not returned to the draw pile). */
    exhaustOnPlay?: boolean;
    /**
     * When false, omit from the Card index / collection catalog.
     * Defaults to true for base cards — mods only need to add an entry to `cards.json`.
     * Upgraded forms (`upgradeOf`) are never cataloged.
     */
    collectible?: boolean;
    /** Heal the player by this amount when this card's damage kills an enemy. */
    healOnKill?: number;
    /** Multiplies this card's resolved chain damage (after streaks and boosts). */
    stepDamageMultiplier?: number;
    /** After this card deals damage, cycle the attack target to the next living enemy. */
    switchTargetAfterHit?: boolean;
    /** Applies a ±% battle modifier when this card activates in the chain. */
    battleModifier?: {
        stat: import('../combat/battleModifiers').BattleModifierStat;
        delta: number;
        duration?: import('../combat/battleModifiers').BattleModifierDuration;
    };
}

interface CardDefinitionJson extends Omit<CardDefinition, 'tier' | 'upgradesTo' | 'upgradeOf'> {
    tier?: CardTier;
    noUpgrade?: boolean;
    /** Field overrides applied when materializing the upgraded form. */
    upgrade?: Partial<Pick<
        CardDefinition,
        | 'power'
        | 'label'
        | 'maxChainActivations'
        | 'chainStepDistance'
        | 'handEndPenalty'
        | 'discardFromHandOnPlay'
        | 'healOnKill'
        | 'stepDamageMultiplier'
        | 'switchTargetAfterHit'
        | 'battleModifier'
        | 'exhaustOnPlay'
        | 'cornerTurn'
        | 'wrapEdges'
        | 'chainAbilityIds'
        | 'collectible'
    >>;
}

export interface GameRules {
    activationStepMs: number;
    enemyTurnMs: number;
    deckSize: number;
    handSize: number;
    energyPerTurn: number;
    enemyDamageRampPerAttack: number;
    /** Flat enemy attack added after each enemy response (one player Attack). */
    enemyStrengthPerTurn: number;
    /** Fight HP rolls this fraction above/below the enemy's median maxHealth. */
    enemyHealthVariance: number;
    /** Flat integrity added to every enemy median before the variance roll. */
    enemyHealthBonus: number;
    /** Hand rerolls shared across all fights on the current floor. */
    rerollsPerFloor: number;
    player: { maxHealth: number };
    defaultEnemyId: string;
    offChainBonus: { attackDamage: number; defendArmor: number };
    hazard: { definitionId: string };
    siphon: { definitionId: string };
    typeStackBonus: { perDuplicate: number };
    fieldBoost: { definitionId: string; nextStepMultiplier: number };
    activationStart: { row: number; col: number };
    activationStartColumn: number;
    maxChainSteps: number;
    battleModifier?: { step: number; enemyIntentChance: number };
    chainAbilities: {
        poisonTrail: { damagePerSubsequentCard: number };
        fireAlternation: { bonusDamagePerAlternatingStep: number };
        bleed: { attackThreshold: number; bonusPerExtraAttack: number };
        fortify: { defendThreshold: number; armorPerExtraDefend: number };
        overload: { damagePerAbilityCard: number };
    };
}

/** Canonical upgraded definition id for a base card. */
export const upgradedCardId = (baseId: string): string => `${baseId}-plus`;

const materializeDefinitions = (rawCards: readonly CardDefinitionJson[]): CardDefinition[] =>
{
    const definitions: CardDefinition[] = [];

    for (const raw of rawCards)
    {
        const { noUpgrade, upgrade, tier = 1, ...rest } = raw;
        const base: CardDefinition = {
            ...rest,
            tier,
            label: cardLabel(rest.id, rest.label),
        };

        if (!noUpgrade)
        {
            const plusId = upgradedCardId(base.id);
            base.upgradesTo = plusId;

            const plus: CardDefinition = {
                ...base,
                ...upgrade,
                id: plusId,
                label: upgrade?.label ?? `${base.label}+`,
                tier: base.tier,
                upgradeOf: base.id,
                upgradesTo: undefined,
            };

            definitions.push(base);
            definitions.push(plus);
            continue;
        }

        definitions.push(base);
    }

    return definitions;
};

const definitionsList = materializeDefinitions(cardsData.cards as CardDefinitionJson[]);
const definitions = new Map<string, CardDefinition>(
    definitionsList.map((card) => [ card.id, card ]),
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

export const CARD_DEFINITIONS: readonly CardDefinition[] = definitionsList;

export const getChainStepDistance = (definition: CardDefinition): number =>
    Math.max(1, definition.chainStepDistance ?? 1);

export const isCardUnplayable = (definition: CardDefinition): boolean =>
    definition.unplayable === true;

export const isCardNonRerollable = (definition: CardDefinition): boolean =>
    definition.nonRerollable === true;

export const getCardHandEndPenalty = (definition: CardDefinition): number =>
    Math.max(0, definition.handEndPenalty ?? 0);

export const getCardDiscardFromHandCount = (definition: CardDefinition): number =>
    Math.max(0, definition.discardFromHandOnPlay ?? 0);

export const isCardExhaustOnPlay = (definition: CardDefinition): boolean =>
    definition.exhaustOnPlay === true;

export const getCardHealOnKill = (definition: CardDefinition): number =>
    Math.max(0, definition.healOnKill ?? 0);

export const isUpgradedCard = (definitionId: string): boolean =>
    Boolean(getCardDefinition(definitionId)?.upgradeOf);

export const canUpgradeCard = (definitionId: string): boolean =>
    Boolean(getCardDefinition(definitionId)?.upgradesTo);

/** Base id used for archetype tagging (upgraded forms map to their base). */
export const getCardArchetypeBaseId = (definitionId: string): string =>
    getCardDefinition(definitionId)?.upgradeOf ?? definitionId;
