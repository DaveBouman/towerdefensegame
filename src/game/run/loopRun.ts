import { getCardGameEnemyDefinitionOrThrow } from '../cardGame/config/enemyCatalog';
import { GAME_RULES } from '../cardGame/config/cardRegistry';
import { getEnemyIdentity } from '../cardGame/presentation/enemyIdentity';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import { BODY_MOD_IDS } from './bodyMods';
import type { RunDeckCard } from './runDeck';
import { pickRandom, shuffleInPlace } from '../random/rng';

/** Steps on the walk map (Loop Hero road) — not card-board slots. */
export const LOOP_MAP_STEPS = 16;

/** Starter arrows — from top-left, only right and down. */
export const LOOP_STARTER_ARROWS: readonly CardDirection[] = [ 'right', 'down' ];

/** One enemy stationed on the circular walk map. */
export interface LoopStation {
    /** Index 0 … LOOP_MAP_STEPS-1 on the walk ring. */
    stepIndex: number;
    enemyId: string;
}

export interface LoopLootDef {
    id: string;
    label: string;
    blurb: string;
    bodyModId?: string;
    addCardId?: string;
}

/** Card pick after clearing a station — unlocks more routing. */
export interface LoopStationCardOffer {
    definitionId: string;
    label: string;
    blurb: string;
    /** Set when the player chooses a direction on the reward screen. */
    arrow?: CardDirection;
}

export interface LoopEncounter {
    id: string;
    title: string;
    blurb: string;
    dungeon: boolean;
    stations: readonly LoopStation[];
    kit: readonly RunDeckCard[];
}

/** Lean starter kit — arrows forced to right/down when dealt. */
const SURFACE_KIT: readonly RunDeckCard[] = [
    { definitionId: 'attack' },
    { definitionId: 'attack' },
    { definitionId: 'attack' },
    { definitionId: 'attack' },
    { definitionId: 'defend' },
    { definitionId: 'defend' },
    { definitionId: 'defend' },
    { definitionId: 'boost' },
    { definitionId: 'fire' },
    { definitionId: 'poison' },
];

const DUNGEON_KIT: readonly RunDeckCard[] = [
    ...SURFACE_KIT,
    { definitionId: 'attack' },
    { definitionId: 'boost' },
];

/** Unlocks after station clears — player picks the arrow when taking the card. */
const STATION_CARD_POOL: readonly LoopStationCardOffer[] = [
    {
        definitionId: 'attack-leap',
        label: 'Leap Strike',
        blurb: 'Jump a tile — opens branching routes.',
    },
    {
        definitionId: 'defend-leap',
        label: 'Leap Guard',
        blurb: 'Defend that leaps — armor with reach.',
    },
    {
        definitionId: 'echo',
        label: 'Echo',
        blurb: 'Replay the previous card in the chain.',
    },
    {
        definitionId: 'switchback',
        label: 'Switchback',
        blurb: 'Turns the chain — unlocks left routing.',
    },
    {
        definitionId: 'attack-special',
        label: 'Strike',
        blurb: 'Diagonal attack — more path combinations.',
    },
    {
        definitionId: 'rupture',
        label: 'Rupture',
        blurb: 'Heavy hit for closing long chains.',
    },
    {
        definitionId: 'boost',
        label: 'Boost',
        blurb: 'Double the next step.',
    },
    {
        definitionId: 'fire',
        label: 'Fire',
        blurb: 'Fire trail combos with attacks.',
    },
    {
        definitionId: 'poison',
        label: 'Rad',
        blurb: 'Poison trail — more combo lines.',
    },
    {
        definitionId: 'attack',
        label: 'Attack',
        blurb: 'Extra attack — aim it where you need it.',
    },
    {
        definitionId: 'defend',
        label: 'Defend',
        blurb: 'Extra guard — time it to the enemy hit.',
    },
];

export const LOOP_SURFACE: LoopEncounter = {
    id: 'loop-surface',
    title: 'The Ring',
    blurb: 'Walk the circular map. Stations hold enemies — fight them on your chain board.',
    dungeon: false,
    stations: [
        { stepIndex: 3, enemyId: 'basic' },
        { stepIndex: 7, enemyId: 'basic' },
        { stepIndex: 12, enemyId: 'thornward' },
    ],
    kit: SURFACE_KIT,
};

export const LOOP_DUNGEON: LoopEncounter = {
    id: 'loop-dungeon',
    title: 'Deep Ring',
    blurb: 'Harder stations on the same walk map. Clear for richer loot.',
    dungeon: true,
    stations: [
        { stepIndex: 2, enemyId: 'thornward' },
        { stepIndex: 6, enemyId: 'smokebinder' },
        { stepIndex: 10, enemyId: 'gridlock' },
        { stepIndex: 14, enemyId: 'basic' },
    ],
    kit: DUNGEON_KIT,
};

export const LOOP_LOOT: readonly LoopLootDef[] = [
    {
        id: 'whetstone',
        label: 'Whetstone',
        blurb: 'Attacks in the chain hit harder (Razor Feed).',
        bodyModId: BODY_MOD_IDS.razorFeed,
    },
    {
        id: 'pyre-shard',
        label: 'Pyre Shard',
        blurb: 'Fire synergies run hotter (Pyre Link).',
        bodyModId: BODY_MOD_IDS.pyreLink,
    },
    {
        id: 'venom-vial',
        label: 'Venom Vial',
        blurb: 'Poison sticks longer (Venom Latch).',
        bodyModId: BODY_MOD_IDS.venomLatch,
    },
    {
        id: 'gyro-chip',
        label: 'Gyro Chip',
        blurb: 'Left-routing hits punch up (Portside Gyro).',
        bodyModId: BODY_MOD_IDS.portsideGyro,
    },
    {
        id: 'spare-boost',
        label: 'Spare Boost',
        blurb: 'Take an extra Boost into the kit.',
        addCardId: 'boost',
    },
    {
        id: 'spare-echo',
        label: 'Spare Echo',
        blurb: 'Take an Echo into the kit.',
        addCardId: 'echo',
    },
    {
        id: 'plating',
        label: 'Scrap Plating',
        blurb: 'Block a hit (Reactive Plating).',
        bodyModId: BODY_MOD_IDS.reactivePlating,
    },
    {
        id: 'mark-chip',
        label: 'Mark Chip',
        blurb: 'Every 5th attack doubles (Mark V).',
        bodyModId: BODY_MOD_IDS.markFive,
    },
];

export const getLoopLoot = (id: string): LoopLootDef =>
{
    const loot = LOOP_LOOT.find((entry) => entry.id === id);

    if (!loot)
    {
        throw new Error(`Unknown loop loot: ${id}`);
    }

    return loot;
};

export const rollLoopLootOffers = (dungeon: boolean, count = 3): LoopLootDef[] =>
{
    const pool = [ ...LOOP_LOOT ];
    shuffleInPlace(pool);
    const picks = pool.slice(0, Math.min(count, pool.length));

    if (dungeon)
    {
        const bodyMods = LOOP_LOOT.filter((entry) => entry.bodyModId);

        if (picks.every((entry) => !entry.bodyModId) && bodyMods.length > 0)
        {
            picks[0] = pickRandom(bodyMods);
        }
    }

    return picks;
};

/** Pick 3 station card unlocks (more arrows / combos). */
export const rollStationCardOffers = (count = 3): LoopStationCardOffer[] =>
{
    const pool = [ ...STATION_CARD_POOL ];
    shuffleInPlace(pool);

    return pool.slice(0, Math.min(count, pool.length));
};

/** Assign right/down only on starter kit cards that have no arrow yet. */
export const assignLoopStarterArrows = (kit: readonly RunDeckCard[]): RunDeckCard[] =>
{
    let index = 0;

    return kit.map((card) =>
    {
        if (card.arrow)
        {
            return { ...card };
        }

        const arrow = LOOP_STARTER_ARROWS[index % LOOP_STARTER_ARROWS.length]!;
        index += 1;

        return { ...card, arrow };
    });
};

export const buildLoopKit = (
    encounter: LoopEncounter,
    homeLootIds: readonly string[],
): RunDeckCard[] =>
{
    const kit: RunDeckCard[] = encounter.kit.map((card) => ({ ...card }));

    for (const lootId of homeLootIds)
    {
        const loot = getLoopLoot(lootId);

        if (loot.addCardId)
        {
            kit.push({ definitionId: loot.addCardId });
        }
    }

    return assignLoopStarterArrows(kit);
};

export const bodyModsFromHomeLoot = (homeLootIds: readonly string[]): string[] =>
{
    const mods: string[] = [];

    for (const lootId of homeLootIds)
    {
        const loot = getLoopLoot(lootId);

        if (loot.bodyModId && !mods.includes(loot.bodyModId))
        {
            mods.push(loot.bodyModId);
        }
    }

    return mods;
};

export const getLoopEncounter = (dungeon: boolean): LoopEncounter =>
    dungeon ? LOOP_DUNGEON : LOOP_SURFACE;

export const stationAtStep = (
    encounter: LoopEncounter,
    stepIndex: number,
): LoopStation | undefined =>
    encounter.stations.find((station) => station.stepIndex === stepIndex);

export const getStationPreview = (enemyId: string) =>
{
    const enemy = getCardGameEnemyDefinitionOrThrow(enemyId);
    const identity = getEnemyIdentity(enemyId);

    return {
        label: enemy.label,
        hp: enemy.maxHealth,
        portraitFile: identity.portraitFile ?? 'basic.png',
        attackDuration: enemy.attackDuration ?? GAME_RULES.defaultEnemyAttackDuration ?? 30,
    };
};

/** Polar position for a step on the walk ring (SVG viewBox 0..100). */
export const loopStepPosition = (
    stepIndex: number,
    total = LOOP_MAP_STEPS,
    radius = 36,
    cx = 50,
    cy = 50,
): { x: number; y: number } =>
{
    const angle = (stepIndex / total) * Math.PI * 2 - Math.PI / 2;

    return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
    };
};
