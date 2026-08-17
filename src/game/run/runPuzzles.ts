import { random } from '../random/rng';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import type { RunEventEffect } from './runEventTypes';
import { rollCardReward } from './rewards';
import { RUN_ECONOMY } from './config/runEconomy';

export interface PuzzleCardSpec {
    definitionId: string;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
}

export interface RunPuzzleDefinition {
    id: string;
    title: string;
    intro: string;
    hint: string;
    /** Fixed hand dealt for this trial (arrows preset so layouts are learnable). */
    cards: readonly PuzzleCardSpec[];
    /** Minimum total enemy damage from one attack chain. */
    damageTarget: number;
    successEffects: readonly RunEventEffect[];
    failureEffects: readonly RunEventEffect[];
}

const PUZZLE_POOL: readonly (readonly [string, number])[] = [
    [ 'boost-basics', 2 ],
    [ 'triple-strike', 2 ],
    [ 'looping-strike', 2 ],
    [ 'fire-alternation', 2 ],
    [ 'rupture-bleed', 1 ],
];

const pz = RUN_ECONOMY.puzzles;

export const RUN_PUZZLES: Record<string, RunPuzzleDefinition> = {
    'boost-basics': {
        id: 'boost-basics',
        title: 'Field Boost',
        intro: 'A training dummy waits. Chain a Boost into your attacks — it doubles the next card\'s power.',
        hint: 'Place Boost in column 0, then two Attacks in a row pointing right. Start the chain on Boost.',
        cards: [
            { definitionId: 'boost', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        damageTarget: 16,
        successEffects: [
            { kind: 'gold', amount: pz.boostBasics.successGold },
            { kind: 'lose-gold', amount: pz.boostBasics.successTax },
            { kind: 'add-curse', cardId: 'fuse', count: 1 },
        ],
        failureEffects: [
            { kind: 'damage', amount: pz.boostBasics.failDamage },
        ],
    },
    'triple-strike': {
        id: 'triple-strike',
        title: 'Attack Streak',
        intro: 'Repeated attack cards in one chain stack — each copy hits harder than the last.',
        hint: 'Line up three Attacks in a row from column 0, all pointing right.',
        cards: [
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        damageTarget: 18,
        successEffects: [
            { kind: 'gold', amount: pz.tripleStrike.successGold },
            { kind: 'lose-gold', amount: pz.tripleStrike.successTax },
        ],
        failureEffects: [
            { kind: 'damage', amount: pz.tripleStrike.failDamage },
        ],
    },
    'looping-strike': {
        id: 'looping-strike',
        title: 'Strike Loop',
        intro: 'Strike cards can activate twice when the chain loops back through them.',
        hint: 'Strike in column 0 pointing right, Attack in column 1 pointing left back into Strike.',
        cards: [
            { definitionId: 'attack-special', arrow: 'right' },
            { definitionId: 'attack', arrow: 'left' },
        ],
        damageTarget: 22,
        successEffects: [
            { kind: 'gold', amount: pz.loopingStrike.successGold },
            { kind: 'lose-gold', amount: pz.loopingStrike.successTax },
            { kind: 'add-curse', cardId: 'fuse', count: 1 },
        ],
        failureEffects: [
            { kind: 'damage', amount: pz.loopingStrike.failDamage },
        ],
    },
    'fire-alternation': {
        id: 'fire-alternation',
        title: 'Burning Rhythm',
        intro: 'Fire rewards alternating Attack and Defend steps after it in the chain.',
        hint: 'Fire → Attack → Defend → Attack in one row, all pointing right.',
        cards: [
            { definitionId: 'fire', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'defend', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        damageTarget: 21,
        successEffects: [
            { kind: 'gold', amount: pz.fireAlternation.successGold },
            { kind: 'lose-gold', amount: pz.fireAlternation.successTax },
            { kind: 'add-curse', cardId: 'burden', count: 1 },
        ],
        failureEffects: [
            { kind: 'damage', amount: pz.fireAlternation.failDamage },
        ],
    },
    'rupture-bleed': {
        id: 'rupture-bleed',
        title: 'Rupture Combo',
        intro: 'Rupture adds bonus damage when enough attack cards follow it in the chain.',
        hint: 'Rupture first, then three Attacks in a row — stack the streak for bleed bonus.',
        cards: [
            { definitionId: 'rupture', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        damageTarget: 26,
        successEffects: [
            { kind: 'gold', amount: pz.ruptureBleed.successGold },
            { kind: 'lose-gold', amount: pz.ruptureBleed.successTax },
            { kind: 'add-curse', cardId: 'burden', count: 1 },
        ],
        failureEffects: [
            { kind: 'damage', amount: pz.ruptureBleed.failDamage },
        ],
    },
};

/** Weighted-random puzzle id (caller must seed first). */
export const rollPuzzleId = (): string =>
{
    const total = PUZZLE_POOL.reduce((sum, [ , weight ]) => sum + weight, 0);
    let roll = random() * total;

    for (const [ id, weight ] of PUZZLE_POOL)
    {
        if (roll < weight)
        {
            return id;
        }

        roll -= weight;
    }

    return PUZZLE_POOL[0]![0];
};

export const getRunPuzzle = (puzzleId: string): RunPuzzleDefinition =>
{
    const puzzle = RUN_PUZZLES[puzzleId];

    if (!puzzle)
    {
        throw new Error(`Unknown run puzzle: ${puzzleId}`);
    }

    return puzzle;
};

/** Total enemy damage from an attack sequence (steps + off-chain + ability). */
export const computePuzzleDamageDealt = (sequence: {
    totalDamage: number;
    offChainDamage: number;
    abilityEnemyDamage: number;
}): number =>
    sequence.totalDamage + sequence.offChainDamage + sequence.abilityEnemyDamage;

export const PUZZLE_CARD_REWARD_COUNT = 3;

/** Rolls card choices for a passed combo trial (caller must seed first). */
export const rollPuzzleCardReward = (
    deckDefinitionIds: readonly string[] = [],
    floor = 1,
): string[] =>
    rollCardReward(PUZZLE_CARD_REWARD_COUNT, 'standard', { deckDefinitionIds, floor });
