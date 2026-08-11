import { pickRandom, random } from '../random/rng';
import { STREET_ENEMY_POOLS } from './battleEncounterPools';
import {
    expandRolledEnemy,
    maybeAppendFieldMedic,
} from './battleEncounterRoll';
import { rewardForNodeKind } from './rewards';
import { rollRunEventIdExcluding } from './runEvents';
import type { RunReward } from './rewards';

export type SignalOutcome =
    | { kind: 'event'; eventId: string }
    | { kind: 'ambush'; enemyId: string; enemyIds?: string[]; reward: RunReward };

/** Chance a signal node is a hostile ambush instead of an encounter (0–1). */
export const getSignalAmbushChance = (priorSignalVisits: number): number =>
{
    if (priorSignalVisits <= 0)
    {
        return 0;
    }

    // 2nd signal ~18%, then +17% per prior visit, capped at 72%.
    return Math.min(0.72, 0.18 + (priorSignalVisits - 1) * 0.17);
};

const rollAmbushEnemies = (row: number): { enemyId: string; enemyIds?: string[] } =>
{
    const pool = STREET_ENEMY_POOLS[row] ?? STREET_ENEMY_POOLS[0]!;
    const enemyId = pickRandom([ ...pool ]);

    return maybeAppendFieldMedic(expandRolledEnemy(enemyId), row, true);
};

/**
 * Resolves what happens when the player jacks into a signal node.
 * Caller must seed first (`seedScope(seed, 'signal:<nodeId>')`).
 */
export const resolveSignalVisit = (
    priorSignalVisits: number,
    row: number,
    excludedEventIds: ReadonlySet<string> = new Set(),
): SignalOutcome =>
{
    const ambushChance = getSignalAmbushChance(priorSignalVisits);

    if (random() < ambushChance)
    {
        const enemies = rollAmbushEnemies(row);
        const reward = rewardForNodeKind('enemy');

        if (!reward)
        {
            throw new Error('Signal ambush requires a street-op card reward.');
        }

        return {
            kind: 'ambush',
            ...enemies,
            reward,
        };
    }

    return {
        kind: 'event',
        eventId: rollRunEventIdExcluding(excludedEventIds),
    };
};
