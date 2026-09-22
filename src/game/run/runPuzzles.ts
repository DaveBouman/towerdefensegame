import { random } from '../random/rng';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import type { RunEventEffect } from './runEventTypes';
import { rollCardReward } from './rewards';
import { RUN_ECONOMY } from './config/runEconomy';
import {
    TUTORIAL_WIZARD_HINT,
    TUTORIAL_WIZARD_PUZZLE_ID,
    TUTORIAL_WIZARD_STEPS,
} from './tutorialWizard';
import {
    damageTargetFromWin,
    formatPuzzleGoal,
    type PuzzleWinRule,
} from './puzzleWin';
import { CROSS_ROAD, EDGE_RING_ROAD, snakeRoad } from './roadPaths';
import type { SlotPosition } from '../cardGame/domain/types';

export type { PuzzleWinRule } from './puzzleWin';
export {
    damageTargetFromWin,
    evaluatePuzzleWin,
    formatPuzzleFailHint,
    formatPuzzleGoal,
} from './puzzleWin';
export { CROSS_ROAD, EDGE_RING_ROAD, snakeRoad } from './roadPaths';

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
    /** Fixed hand dealt for this trial. */
    cards: readonly PuzzleCardSpec[];
    /** Clear condition — prefer walking the painted road. */
    win: PuzzleWinRule;
    /**
     * Painted Loop Hero road on the board (gallery). Chain should walk these tiles.
     */
    road?: readonly SlotPosition[];
    /**
     * Gallery roads. When false, kept for run-event rolls only.
     */
    gallery?: boolean;
    successEffects: readonly RunEventEffect[];
    failureEffects: readonly RunEventEffect[];
}


/** @deprecated Prefer `puzzle.win` + `damageTargetFromWin`. */
export const getPuzzleDamageTarget = (puzzle: RunPuzzleDefinition): number =>
    damageTargetFromWin(puzzle.win);

const cardsOf = (
    definitionId: string,
    count: number,
    arrow: CardDirection = 'right',
): PuzzleCardSpec[] =>
    Array.from({ length: count }, () => ({ definitionId, arrow }));

const kitIds = (cards: readonly PuzzleCardSpec[]): string[] =>
    cards.map((card) => card.definitionId);

/** Run-event weighted pool (short kits). */
const PUZZLE_POOL: readonly (readonly [string, number])[] = [
    [ 'boost-basics', 2 ],
    [ 'triple-strike', 2 ],
    [ 'looping-strike', 2 ],
    [ 'fire-alternation', 2 ],
    [ 'rupture-bleed', 1 ],
];

const pz = RUN_ECONOMY.puzzles;
const lightFx = {
    successEffects: [
        { kind: 'gold' as const, amount: pz.tripleStrike.successGold },
        { kind: 'lose-gold' as const, amount: pz.tripleStrike.successTax },
    ],
    failureEffects: [
        { kind: 'damage' as const, amount: pz.tripleStrike.failDamage },
    ],
};

export const RUN_PUZZLES: Record<string, RunPuzzleDefinition> = {
    // —— Gallery roads (painted path on the board — Loop Hero) ——
    'ring-road': {
        id: 'ring-road',
        title: 'Ring Road',
        intro: 'The road is painted on the board. Pack cards along the ring and walk the whole loop.',
        hint: 'Place on the amber road tiles. Chain must visit every road tile. Start at top-left.',
        cards: [
            ...cardsOf('attack', 7, 'right'),
            ...cardsOf('attack', 4, 'down'),
            ...cardsOf('attack', 4, 'left'),
            ...cardsOf('attack', 1, 'up'),
        ],
        road: EDGE_RING_ROAD,
        win: { kind: 'visitTiles', tiles: EDGE_RING_ROAD },
        gallery: true,
        ...lightFx,
    },
    'full-pack': {
        id: 'full-pack',
        title: 'Pack the Road',
        intro: 'Backpack density on a fixed road — every piece must fire while you walk the amber path.',
        hint: 'Fill the painted snake. Boost/Fire early. Every card must activate.',
        cards: [
            { definitionId: 'boost', arrow: 'right' },
            { definitionId: 'fire', arrow: 'right' },
            ...cardsOf('attack', 6, 'right'),
            ...cardsOf('defend', 3, 'right'),
            { definitionId: 'rupture', arrow: 'right' },
        ],
        road: snakeRoad(12),
        win: { kind: 'useAllCards', cards: [] },
        gallery: true,
        ...lightFx,
    },
    'mile-markers': {
        id: 'mile-markers',
        title: 'Fill Lane',
        intro: 'A denser road: snake-fill fifteen tiles. Pack the amber path end to end.',
        hint: 'Follow the painted snake from top-left. Visit every amber tile.',
        cards: [
            ...cardsOf('attack', 8, 'right'),
            ...cardsOf('attack', 4, 'down'),
            ...cardsOf('attack', 3, 'left'),
        ],
        road: snakeRoad(15),
        win: { kind: 'visitTiles', tiles: snakeRoad(15) },
        gallery: true,
        ...lightFx,
    },
    'long-walk': {
        id: 'long-walk',
        title: 'Long Walk',
        intro: 'Walk the cross-road. Stretch the chain with Strike / Switchback / Echo along the paint.',
        hint: 'Stay on the amber path. Need 12+ road tiles visited (the whole cross).',
        cards: [
            { definitionId: 'attack-special', arrow: 'right' },
            { definitionId: 'switchback', arrow: 'right' },
            { definitionId: 'echo', arrow: 'right' },
            ...cardsOf('attack', 6, 'right'),
            ...cardsOf('defend', 2, 'left'),
            { definitionId: 'joker', arrow: 'down' },
        ],
        road: CROSS_ROAD,
        win: { kind: 'visitTiles', tiles: CROSS_ROAD },
        gallery: true,
        ...lightFx,
    },
    'camp-lattice': {
        id: 'camp-lattice',
        title: 'Camp Road',
        intro: 'Pack Boost, Fire, Rupture on the snake road. Wake the whole kit on the painted path.',
        hint: 'Fill the amber snake. Order: Boost → Fire → Rupture → body. All must fire.',
        cards: [
            { definitionId: 'boost', arrow: 'right' },
            { definitionId: 'fire', arrow: 'right' },
            { definitionId: 'rupture', arrow: 'right' },
            ...cardsOf('attack', 6, 'right'),
            ...cardsOf('defend', 3, 'right'),
        ],
        road: snakeRoad(12),
        win: { kind: 'useAllCards', cards: [] },
        gallery: true,
        ...lightFx,
    },

    // —— Short run-event kits (not gallery) ——
    'boost-basics': {
        id: 'boost-basics',
        title: 'Boost Latch',
        intro: 'Boost only helps if the chain enters it first.',
        hint: 'Boost in column 0 → two Attacks right.',
        cards: [
            { definitionId: 'boost', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        win: { kind: 'damage', target: 16 },
        gallery: false,
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
        title: 'Full Line',
        intro: 'Three Attacks on one continuous path.',
        hint: 'Three Attacks in a row from column 0.',
        cards: [
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        win: {
            kind: 'useAllCards',
            cards: [ 'attack', 'attack', 'attack' ],
        },
        gallery: false,
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
        title: 'Echo Path',
        intro: 'Loop back through Strike for a longer chain.',
        hint: 'Strike → Attack → back into Strike.',
        cards: [
            { definitionId: 'attack-special', arrow: 'right' },
            { definitionId: 'attack', arrow: 'left' },
        ],
        win: { kind: 'minLength', length: 3 },
        gallery: false,
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
        title: 'Burn Rhythm',
        intro: 'Fire cares about Attack → Defend → Attack order.',
        hint: 'Fire → Attack → Defend → Attack in one row.',
        cards: [
            { definitionId: 'fire', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'defend', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        win: { kind: 'damage', target: 21 },
        gallery: false,
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
        title: 'Rupture Gate',
        intro: 'Rupture needs a long Attack streak after it.',
        hint: 'Rupture first, then three Attacks.',
        cards: [
            { definitionId: 'rupture', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        win: { kind: 'damage', target: 26 },
        gallery: false,
        successEffects: [
            { kind: 'gold', amount: pz.ruptureBleed.successGold },
            { kind: 'lose-gold', amount: pz.ruptureBleed.successTax },
            { kind: 'add-curse', cardId: 'burden', count: 1 },
        ],
        failureEffects: [
            { kind: 'damage', amount: pz.ruptureBleed.failDamage },
        ],
    },
    'corner-circuit': {
        id: 'corner-circuit',
        title: 'Corner Circuit',
        intro: 'Leap the four near corners in one chain.',
        hint: 'Leap right, leap down, leap left from top-left.',
        cards: [
            { definitionId: 'attack-leap', arrow: 'right' },
            { definitionId: 'attack-leap', arrow: 'down' },
            { definitionId: 'attack-leap', arrow: 'left' },
            { definitionId: 'attack', arrow: 'up' },
        ],
        win: {
            kind: 'visitTiles',
            tiles: [
                { row: 0, col: 0 },
                { row: 0, col: 2 },
                { row: 2, col: 2 },
                { row: 2, col: 0 },
            ],
        },
        gallery: false,
        ...lightFx,
    },
    [TUTORIAL_WIZARD_PUZZLE_ID]: {
        id: TUTORIAL_WIZARD_PUZZLE_ID,
        title: 'Training Sim',
        intro: TUTORIAL_WIZARD_STEPS['welcome'].body,
        hint: TUTORIAL_WIZARD_HINT,
        cards: [],
        win: { kind: 'damage', target: 1 },
        gallery: false,
        successEffects: [],
        failureEffects: [],
    },
};

// Fill useAllCards multisets from kit definitions.
for (const id of [ 'full-pack', 'camp-lattice' ] as const)
{
    const puzzle = RUN_PUZZLES[id]!;
    RUN_PUZZLES[id] = {
        ...puzzle,
        win: { kind: 'useAllCards', cards: kitIds(puzzle.cards) },
    };
}

/** Weighted-random puzzle id for run events (caller must seed first). */
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

/** Dense gallery lattices only (excludes short event kits + training sim). */
export const listGalleryPuzzles = (): readonly RunPuzzleDefinition[] =>
    Object.values(RUN_PUZZLES).filter((puzzle) => puzzle.gallery === true);

export const getPuzzleGoalLine = (puzzle: RunPuzzleDefinition): string =>
    formatPuzzleGoal(puzzle.win);

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
    ownedDefinitionIds: readonly string[],
): string[] => rollCardReward(ownedDefinitionIds, PUZZLE_CARD_REWARD_COUNT);
