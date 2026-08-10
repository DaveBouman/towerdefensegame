import { pickRandom, random } from '../random/rng';
import { rewardForNodeKind } from './rewards';
import { rollRunEventIdExcluding } from './runEvents';
import type { RunReward } from './rewards';

/** Enemy pools per column — mirrors street-op difficulty in `runMap.ts`. */
const SIGNAL_AMBUSH_ENEMY_POOLS: readonly (readonly string[])[] = [
    [ 'basic' ],
    [ 'basic', 'thornward' ],
    [ 'basic', 'thornward' ],
    [ 'thornward', 'saboteur' ],
    [ 'thornward', 'saboteur', 'gridlock' ],
    [ 'saboteur', 'smokebinder', 'gridlock' ],
    [ 'saboteur', 'smokebinder', 'gridlock' ],
    [ 'saboteur', 'smokebinder' ],
    [ 'smokebinder', 'gridlock' ],
    [ 'smokebinder' ],
    [ 'warden' ],
];

const MEDIC_DUO_CHANCE = 0.22;
const MEDIC_DUO_START_ROW = 4;
const MEDIC_DUO_END_ROW = 8;

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
    const pool = SIGNAL_AMBUSH_ENEMY_POOLS[row] ?? SIGNAL_AMBUSH_ENEMY_POOLS[0]!;
    const enemyId = pickRandom([ ...pool ]);

    if (
        row >= MEDIC_DUO_START_ROW
        && row <= MEDIC_DUO_END_ROW
        && enemyId !== 'field-medic'
        && random() < MEDIC_DUO_CHANCE
    )
    {
        return { enemyId, enemyIds: [ enemyId, 'field-medic' ] };
    }

    return { enemyId };
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
