/** Thin re-export barrel — prefer importing from focused combat modules directly when adding new call sites. */

export {
    isJokerDefinition,
    isLoopResetDefinition,
    isCornerDefinition,
    isWrapDefinition,
    type ChainWalkState,
    createChainWalkState,
    resetActivationsBeforeLoop,
    tryBuildActivationStep,
    getNextChainSlot,
    getCornerNextSlot,
    planActivationChain,
    planChainPathPreview,
    type ChainPathPreview,
    getNextChainSlotFromStep,
} from './chainPathfinding';

export {
    isHazardDefinition,
    isSiphonDefinition,
    isConvertibleFieldNode,
    applyBombConversion,
} from './bombConversion';

export {
    getBoostMultiplierForStep,
    isStreakNeutralBehavior,
    computeStreakAtIndex,
    isBoostDefinition,
    computeChainTypeMultipliers,
    applyBoostBonuses,
    isBoostedChainStep,
    resolveChainSteps,
    resolveChainStep,
} from './chainResolve';

export {
    areSlotsAdjacent,
    isTypeStackBehavior,
    slotsCanTypeStack,
    typeStackMultiplier,
} from './typeStack';

export {
    isEchoDefinition,
    collectDisarmResults,
    buildAttackSequence,
    computeOffChainBonuses,
    computeHazardDamage,
    computeSiphonHeal,
    computeUnchainedCurseDamage,
    getOffChainSlots,
    getUnchainedHazardSlots,
    getUnchainedSiphonSlots,
    getUnchainedCurseSlots,
    planAttack,
    getJokerDirectionChoices,
    applyJokerChosenDirection,
} from './attackSequence';
