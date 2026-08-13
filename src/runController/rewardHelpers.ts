import { seedScope } from '../game/random/rng';
import { rollBattleBodyModReward, type BodyModRewardPool } from '../game/run/bodyMods';
import type { RunDeckCard } from '../game/run/runDeck';
import { removeFirstCardByDefinitionId } from '../game/run/runDeck';
import {
    flattenRunReward,
    rollCardReward,
    type CardReward,
    type RunReward,
} from '../game/run/rewards';
import { generateRunMap, type RunMap } from '../game/run/runMap';
import type { RewardStep } from './types';

/** Reseeds the map stream for a run seed and generates a fresh map. */
export const buildMapForSeed = (seed: string): RunMap =>
{
    seedScope(seed, 'map');

    return generateRunMap();
};

/** Deterministic card choices for a node's reward at a given reroll index. */
export const rollRewardForNode = (
    seed: string,
    nodeId: string,
    reward: CardReward,
    rerollIndex: number,
    deckDefinitionIds: readonly string[],
    floor: number,
): string[] =>
{
    seedScope(seed, `reward:${nodeId}:${rerollIndex}`);

    return rollCardReward(reward.choiceCount, reward.pool ?? 'standard', {
        deckDefinitionIds,
        floor,
    });
};

export const buildRewardSteps = (
    seed: string,
    nodeId: string,
    reward: RunReward,
    deckDefinitionIds: readonly string[],
    floor: number,
    ownedBodyMods: readonly string[],
): RewardStep[] =>
{
    const steps: RewardStep[] = [];

    for (const step of flattenRunReward(reward))
    {
        if (step.kind === 'card')
        {
            steps.push({
                kind: 'card',
                reward: step,
                options: rollRewardForNode(seed, nodeId, step, 0, deckDefinitionIds, floor),
                rerollIndex: 0,
            });
            continue;
        }

        if (step.kind === 'body-mod')
        {
            seedScope(seed, `reward:${nodeId}:mod:${steps.length}`);
            const modId = rollBattleBodyModReward(step.pool ?? 'standard', ownedBodyMods);

            if (modId)
            {
                steps.push({
                    kind: 'body-mod',
                    pool: step.pool ?? 'standard',
                    options: [ modId ],
                });
            }
        }
    }

    return steps;
};

export const applyBattleRunDeltas = (
    deck: readonly RunDeckCard[],
    gold: number,
    deltas: { goldStolen?: number; stolenCardIds?: readonly string[] },
    victoryGoldBonus = 0,
): { deck: RunDeckCard[]; gold: number } =>
{
    let nextDeck = [ ...deck ];

    if (deltas.stolenCardIds && deltas.stolenCardIds.length > 0)
    {
        for (const cardId of deltas.stolenCardIds)
        {
            nextDeck = removeFirstCardByDefinitionId(nextDeck, cardId);
        }
    }

    return {
        deck: nextDeck,
        gold: gold + victoryGoldBonus - (deltas.goldStolen ?? 0),
    };
};

export type { BodyModRewardPool };
