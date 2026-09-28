import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ActivationStep, SlotPosition } from '../domain/types';
import { getAlternatingAttackDefendIndicesAfter } from '../abilities/fireAlternation';
import { getDefendIndicesReplacedByPoison } from '../abilities/poisonReplacement';

/** Minimal step shape for trail detection (matches streak preview steps). */
export interface ComboTrailStep
{
    slot: SlotPosition;
    behaviorId: string;
    definitionId?: string;
}

/** One visual combo trail found on a chain. */
export interface ComboTrailHit
{
    behaviorId: string;
    /** Indices into the step list (starter + trail members). */
    indices: number[];
    label: string;
}

export interface ComboTrailDetectArgs
{
    steps: readonly ComboTrailStep[];
    startIndex: number;
    /** Same steps cast for ability helpers that expect ActivationStep.behaviorId. */
    chain: readonly ActivationStep[];
    minLength: number;
}

/**
 * Visual combo-trail detector. Append a new entry to `COMBO_TRAIL_DETECTORS` when
 * adding a combo storm — keep damage/ability logic in `abilities/`, trail indices here.
 */
export interface ComboTrailDetector
{
    id: string;
    /** Behavior that can open this trail when scanned in chain order. */
    starterBehaviorId: string;
    detect: (args: ComboTrailDetectArgs) => ComboTrailHit | null;
}

const stepHasAbility = (step: ActivationStep | ComboTrailStep, abilityId: string): boolean =>
{
    const definitionId = 'definitionId' in step ? step.definitionId : undefined;

    if (!definitionId)
    {
        return false;
    }

    return (getCardDefinitionOrThrow(definitionId).chainAbilityIds ?? []).includes(abilityId);
};

const radTrailDetector: ComboTrailDetector = {
    id: 'rad-trail',
    starterBehaviorId: 'poison',
    detect: ({ startIndex, chain, minLength }) =>
    {
        const defendIndices = getDefendIndicesReplacedByPoison(chain, startIndex);
        const indices = [ startIndex, ...defendIndices ];

        if (indices.length < minLength)
        {
            return null;
        }

        const armorCount = defendIndices.length;

        return {
            behaviorId: 'poison',
            indices,
            label: armorCount > 0 ? `RAD→${armorCount}` : `RAD×${indices.length}`,
        };
    },
};

const fireTrailDetector: ComboTrailDetector = {
    id: 'fire-trail',
    starterBehaviorId: 'fire',
    detect: ({ startIndex, chain, minLength }) =>
    {
        const alternatingIndices = getAlternatingAttackDefendIndicesAfter(chain, startIndex);

        if (alternatingIndices.length < 2)
        {
            return null;
        }

        const indices = [ startIndex, ...alternatingIndices ];

        if (indices.length < minLength)
        {
            return null;
        }

        return {
            behaviorId: 'fire',
            indices,
            label: `FIRE→${alternatingIndices.length}`,
        };
    },
};

/** Bleed: first Rupture/Shiv/… when the chain has enough attacks. */
const bleedTrailDetector: ComboTrailDetector = {
    id: 'bleed-trail',
    starterBehaviorId: 'attack',
    detect: ({ startIndex, steps, chain, minLength }) =>
    {
        const starter = steps[startIndex] ?? chain[startIndex];

        if (!starter || !stepHasAbility(starter, 'bleed'))
        {
            return null;
        }

        if (chain.findIndex((step, index) =>
            stepHasAbility(steps[index] ?? step, 'bleed')) !== startIndex)
        {
            return null;
        }

        const { attackThreshold } = GAME_RULES.chainAbilities.bleed;
        const attackIndices = chain
            .map((step, index) => (step.behaviorId === 'attack' ? index : -1))
            .filter((index) => index >= 0);
        const extraAttacks = Math.max(0, attackIndices.length - attackThreshold);

        if (extraAttacks <= 0 || attackIndices.length < minLength)
        {
            return null;
        }

        return {
            behaviorId: 'bleed',
            indices: attackIndices,
            label: `BLEED→${extraAttacks}`,
        };
    },
};

/** Fortify: first Bulwark/Bramble/… when the chain has enough defends. */
const fortifyTrailDetector: ComboTrailDetector = {
    id: 'fortify-trail',
    starterBehaviorId: 'defend',
    detect: ({ startIndex, steps, chain, minLength }) =>
    {
        const starter = steps[startIndex] ?? chain[startIndex];

        if (!starter || !stepHasAbility(starter, 'fortify'))
        {
            return null;
        }

        if (chain.findIndex((step, index) =>
            stepHasAbility(steps[index] ?? step, 'fortify')) !== startIndex)
        {
            return null;
        }

        const { defendThreshold } = GAME_RULES.chainAbilities.fortify;
        const defendIndices = chain
            .map((step, index) => (step.behaviorId === 'defend' ? index : -1))
            .filter((index) => index >= 0);
        const extraDefends = Math.max(0, defendIndices.length - defendThreshold);

        if (extraDefends <= 0 || defendIndices.length < minLength)
        {
            return null;
        }

        return {
            behaviorId: 'fortify',
            indices: defendIndices,
            label: `FORT→${extraDefends}`,
        };
    },
};

/** Overload: first Surge/Amp when other ability cards are already on the wire. */
const overloadTrailDetector: ComboTrailDetector = {
    id: 'overload-trail',
    starterBehaviorId: 'attack',
    detect: ({ startIndex, steps, chain, minLength }) =>
    {
        const starter = steps[startIndex] ?? chain[startIndex];

        if (!starter || !stepHasAbility(starter, 'overload'))
        {
            return null;
        }

        if (chain.findIndex((step, index) =>
            stepHasAbility(steps[index] ?? step, 'overload')) !== startIndex)
        {
            return null;
        }

        const abilityIndices: number[] = [];

        for (let index = 0; index < chain.length; index++)
        {
            if (index === startIndex)
            {
                continue;
            }

            const step = steps[index] ?? chain[index];
            const definitionId = step && 'definitionId' in step ? step.definitionId : undefined;

            if (!definitionId)
            {
                continue;
            }

            if ((getCardDefinitionOrThrow(definitionId).chainAbilityIds ?? []).length > 0)
            {
                abilityIndices.push(index);
            }
        }

        if (abilityIndices.length <= 0)
        {
            return null;
        }

        const jokerBonus = chain.some((step) => step.behaviorId === 'joker') ? 2 : 1;
        const damage = abilityIndices.length
            * GAME_RULES.chainAbilities.overload.damagePerAbilityCard
            * jokerBonus;
        const indices = [ startIndex, ...abilityIndices ];

        if (indices.length < minLength)
        {
            return null;
        }

        return {
            behaviorId: 'overload',
            indices,
            label: `OVL ${damage}`,
        };
    },
};

/**
 * Ordered list of combo-trail detectors. First match per starter index wins for that
 * starter behavior; multiple starters (Rad then Fire) can still fire on one chain.
 * **To add a combo storm:** implement a detector and push it here.
 */
export const COMBO_TRAIL_DETECTORS: readonly ComboTrailDetector[] = [
    radTrailDetector,
    fireTrailDetector,
    bleedTrailDetector,
    fortifyTrailDetector,
    overloadTrailDetector,
];

const detectorsByStarter = (() =>
{
    const map = new Map<string, ComboTrailDetector[]>();

    for (const detector of COMBO_TRAIL_DETECTORS)
    {
        const list = map.get(detector.starterBehaviorId) ?? [];

        list.push(detector);
        map.set(detector.starterBehaviorId, list);
    }

    return map;
})();

/**
 * Scans the chain for combo trails. Returns hits plus step indices claimed by trails
 * (those steps skip type-stack visuals while still showing the combo storm).
 */
export const collectComboTrails = (
    steps: readonly ComboTrailStep[],
    chain: readonly ActivationStep[],
    minLength = 2,
): { hits: ComboTrailHit[]; consumed: Set<number> } =>
{
    const hits: ComboTrailHit[] = [];
    const consumed = new Set<number>();

    for (let i = 0; i < steps.length; i++)
    {
        const detectors = detectorsByStarter.get(steps[i]!.behaviorId);

        if (!detectors)
        {
            continue;
        }

        for (const detector of detectors)
        {
            const hit = detector.detect({ steps, startIndex: i, chain, minLength });

            if (!hit)
            {
                continue;
            }

            hit.indices.forEach((index) => consumed.add(index));
            hits.push(hit);
            break;
        }
    }

    return { hits, consumed };
};
