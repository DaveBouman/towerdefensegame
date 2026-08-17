import { GAME_RULES, getCardDefinitionOrThrow, getCardHandEndPenalty, getChainStepDistance, type CardDefinition } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import { isEnemyOwnedCard, isFieldOwnedCard, isPlayerOwnedCard } from '../domain/cardOwnership';
import { getInBoundsDirectionsAtDistance, slotKey } from '../domain/cardDirections';
import type {
    ActivationStep,
    AttackSequence,
    AttackStep,
    CardDirection,
    DisarmResult,
    SlotPosition,
} from '../domain/types';
import { resolveChainAbilities } from '../abilities/chainAbilityRegistry';
import { getCardBehaviorOrThrow } from '../effects/cardBehaviorRegistry';
import { isConvertibleFieldNode, isHazardDefinition, isSiphonDefinition } from './bombConversion';
import { getNextChainSlot, planActivationChain } from './chainPathfinding';
import { computeChainTypeMultipliers, resolveChainSteps } from './chainResolve';

export const isEchoDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'echo';

const buildStepContext = (
    board: BoardModel,
    slot: SlotPosition,
    card: import('../domain/types').CardInstance,
) =>
{
    const definition = getCardDefinitionOrThrow(card.definitionId);

    return {
        board,
        slot,
        card,
        definition,
    };
};

const toAttackStep = (step: ActivationStep): AttackStep => ({
    slot: step.slot,
    card: step.card,
    definitionId: step.definitionId,
    damage: step.damage,
    behaviorId: step.behaviorId,
    visualId: step.visualId,
});

export const collectDisarmResults = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): DisarmResult[] =>
{
    const results: DisarmResult[] = [];

    for (const step of chain)
    {
        if (!isConvertibleFieldNode(getCardDefinitionOrThrow(step.definitionId)))
        {
            continue;
        }

        const ctx = buildStepContext(board, step.slot, step.card);
        const behavior = getCardBehaviorOrThrow(ctx.definition.behaviorId);
        const result = behavior.onDisarmed?.(ctx);

        if (result)
        {
            results.push(result);
        }
    }

    return results;
};

export const buildAttackSequence = (
    chain: ActivationStep[],
    board?: BoardModel,
    stepMs = GAME_RULES.activationStepMs,
): AttackSequence =>
{
    const stackMultipliers = computeChainTypeMultipliers(chain);
    const scaledChain = resolveChainSteps(chain);
    const steps = scaledChain.filter((step) => step.damage > 0).map(toAttackStep);
    const totalDamage = steps.reduce((sum, step) => sum + step.damage, 0);
    const offChain = board ? computeOffChainBonuses(board, scaledChain) : { damage: 0, armor: 0 };
    const hazardDamage = board ? computeHazardDamage(board, scaledChain) : 0;
    const siphonHeal = board ? computeSiphonHeal(board, scaledChain) : 0;
    const curseDamage = board ? computeUnchainedCurseDamage(board, scaledChain) : 0;
    const disarmResults = board ? collectDisarmResults(board, scaledChain) : [];
    const abilities = board ? resolveChainAbilities(scaledChain, board) : {
        effects: [],
        enemyDamage: 0,
        playerDamage: 0,
        armorGain: 0,
        poisonStacks: 0,
    };

    return {
        chain: scaledChain,
        steps,
        totalDamage,
        offChainDamage: offChain.damage,
        offChainArmor: offChain.armor,
        hazardDamage,
        siphonHeal,
        chainAbilityEffects: abilities.effects,
        abilityEnemyDamage: abilities.enemyDamage,
        abilityPlayerDamage: abilities.playerDamage + curseDamage,
        abilityArmorGain: abilities.armorGain,
        abilityPoisonStacks: abilities.poisonStacks,
        disarmResults,
        stackMultipliers,
        stepMs,
        durationMs: scaledChain.length * stepMs,
    };
};

/** Cards on the board that never activated in the chain still chip in a small bonus. */
export const computeOffChainBonuses = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): { damage: number; armor: number } =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    let damage = 0;
    let armor = 0;

    for (const slot of board.slotsInOrder())
    {
        if (activated.has(slotKey(slot)))
        {
            continue;
        }

        const card = board.getCardAt(slot);

        if (!card || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (definition.behaviorId === 'attack')
        {
            damage += GAME_RULES.offChainBonus.attackDamage;
        }
        else if (definition.behaviorId === 'defend')
        {
            armor += GAME_RULES.offChainBonus.defendArmor;
        }
    }

    return { damage, armor };
};

/** Enemy traps that were not disarmed in the chain explode for their power. */
export const computeHazardDamage = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): number =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    let damage = 0;

    for (const slot of board.slotsInOrder())
    {
        if (activated.has(slotKey(slot)))
        {
            continue;
        }

        const card = board.getCardAt(slot);

        if (!card || !isEnemyOwnedCard(card))
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (isHazardDefinition(definition))
        {
            damage += definition.power;
        }
    }

    return damage;
};

/** Enemy leech nodes that were not routed into the chain heal the living enemy for their power. */
export const computeSiphonHeal = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): number =>
{
    let heal = 0;

    for (const slot of getUnchainedSiphonSlots(board, chain))
    {
        const card = board.getCardAt(slot);

        if (!card)
        {
            continue;
        }

        heal += getCardDefinitionOrThrow(card.definitionId).power;
    }

    return heal;
};

/**
 * Player curse cards (Burden) left on the board but not routed into the chain
 * deal double their hand-end penalty when the attack resolves.
 */
export const computeUnchainedCurseDamage = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): number =>
{
    let damage = 0;

    for (const slot of getUnchainedCurseSlots(board, chain))
    {
        const card = board.getCardAt(slot);

        if (!card)
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);
        const penalty = getCardHandEndPenalty(definition);

        if (penalty > 0)
        {
            damage += penalty * 2;
        }
    }

    return damage;
};

export const getOffChainSlots = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): SlotPosition[] =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    const slots: SlotPosition[] = [];

    for (const slot of board.slotsInOrder())
    {
        const card = board.getCardAt(slot);

        if (!activated.has(slotKey(slot)) && card && isPlayerOwnedCard(card))
        {
            slots.push({ ...slot });
        }
    }

    return slots;
};

export const getUnchainedHazardSlots = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): SlotPosition[] =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    const slots: SlotPosition[] = [];

    for (const slot of board.slotsInOrder())
    {
        if (activated.has(slotKey(slot)))
        {
            continue;
        }

        const card = board.getCardAt(slot);

        if (!card || !isEnemyOwnedCard(card))
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (isHazardDefinition(definition))
        {
            slots.push({ ...slot });
        }
    }

    return slots;
};

export const getUnchainedSiphonSlots = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): SlotPosition[] =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    const slots: SlotPosition[] = [];

    for (const slot of board.slotsInOrder())
    {
        if (activated.has(slotKey(slot)))
        {
            continue;
        }

        const card = board.getCardAt(slot);

        if (!card || !isEnemyOwnedCard(card))
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (isSiphonDefinition(definition))
        {
            slots.push({ ...slot });
        }
    }

    return slots;
};

/** Player-owned curse cards on the board that were not activated in the chain. */
export const getUnchainedCurseSlots = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): SlotPosition[] =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    const slots: SlotPosition[] = [];

    for (const slot of board.slotsInOrder())
    {
        if (activated.has(slotKey(slot)))
        {
            continue;
        }

        const card = board.getCardAt(slot);

        if (!card || !isPlayerOwnedCard(card))
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (definition.behaviorId === 'curse' && getCardHandEndPenalty(definition) > 0)
        {
            slots.push({ ...slot });
        }
    }

    return slots;
};

export const planAttack = (
    board: BoardModel,
    startSlot: SlotPosition = GAME_RULES.activationStart,
): AttackSequence =>
    buildAttackSequence(planActivationChain(board, startSlot), board);

export const getJokerDirectionChoices = (
    board: BoardModel,
    slot: SlotPosition,
): CardDirection[] =>
{
    const stepDistance = getChainStepDistance(getCardDefinitionOrThrow('joker'));
    const inBounds = getInBoundsDirectionsAtDistance(slot, board.rows, board.cols, stepDistance);

    const withCard = inBounds.filter((direction) =>
        getNextChainSlot(board, slot, direction, stepDistance) !== null,
    );

    return withCard.length > 0 ? withCard : inBounds;
};

/** Applies the player's joker pick to both display arrow and chain exit direction. */
export const applyJokerChosenDirection = (
    step: ActivationStep,
    direction: CardDirection,
): void =>
{
    step.arrow = direction;
    step.exitArrow = direction;
    step.card.arrow = direction;
    step.card.jokerDirectionChosen = true;
};
