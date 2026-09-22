import { getCardGameEnemyDefinitionOrThrow } from '../cardGame/config/enemyCatalog';
import { getEnemyIdentity } from '../cardGame/presentation/enemyIdentity';

/** One skirmish: pick an enemy, build a kit, fight until KO. */
export interface SkirmishEncounter {
    id: string;
    enemyId: string;
    title: string;
    blurb: string;
    /** How many cards the player must pack before the fight. */
    kitSize: number;
}

/** Starter gallery — short fights that teach chain vs counterplay. */
export const SKIRMISH_ENCOUNTERS: readonly SkirmishEncounter[] = [
    {
        id: 'raider-intro',
        enemyId: 'basic',
        title: 'Street Raider',
        blurb: 'Pack a kit, lay your chain, and fight until one of you drops. They hit back.',
        kitSize: 8,
    },
    {
        id: 'thornward-lesson',
        enemyId: 'thornward',
        title: 'Thornward',
        blurb: 'Reflects damage — mix Defend and routing so you are not just all-in Attack.',
        kitSize: 9,
    },
    {
        id: 'smokebinder-smoke',
        enemyId: 'smokebinder',
        title: 'Smokebinder',
        blurb: 'Smokes the board. Bring Fire / routing tools and outlast their intent.',
        kitSize: 10,
    },
    {
        id: 'gridlock-lanes',
        enemyId: 'gridlock',
        title: 'Gridlock',
        blurb: 'Locks columns. Plan leaps and side routes before you commit the kit.',
        kitSize: 10,
    },
];

/** Cards you can pack into a skirmish kit (Backpack-style prep). */
export const SKIRMISH_KIT_POOL: readonly { definitionId: string; maxCopies: number }[] = [
    { definitionId: 'attack', maxCopies: 4 },
    { definitionId: 'defend', maxCopies: 4 },
    { definitionId: 'attack-leap', maxCopies: 2 },
    { definitionId: 'defend-leap', maxCopies: 2 },
    { definitionId: 'joker', maxCopies: 1 },
    { definitionId: 'echo', maxCopies: 1 },
    { definitionId: 'boost', maxCopies: 1 },
    { definitionId: 'fire', maxCopies: 2 },
    { definitionId: 'poison', maxCopies: 1 },
    { definitionId: 'rupture', maxCopies: 1 },
    { definitionId: 'surge', maxCopies: 1 },
    { definitionId: 'bulwark', maxCopies: 1 },
    { definitionId: 'overclock', maxCopies: 1 },
    { definitionId: 'hardwire', maxCopies: 1 },
    { definitionId: 'glitch', maxCopies: 1 },
];

export const getSkirmishEncounter = (id: string): SkirmishEncounter =>
{
    const encounter = SKIRMISH_ENCOUNTERS.find((entry) => entry.id === id);

    if (!encounter)
    {
        throw new Error(`Unknown skirmish encounter: ${id}`);
    }

    return encounter;
};

export const getSkirmishEncounterPreview = (encounter: SkirmishEncounter) =>
{
    const enemy = getCardGameEnemyDefinitionOrThrow(encounter.enemyId);
    const identity = getEnemyIdentity(encounter.enemyId);

    return {
        enemyLabel: enemy.label,
        enemyHp: enemy.maxHealth,
        portraitFile: identity.portraitFile ?? 'basic.png',
        accent: identity.accent,
    };
};

export const countKitCopies = (
    kit: readonly string[],
    definitionId: string,
): number => kit.filter((id) => id === definitionId).length;

export const canAddToKit = (
    kit: readonly string[],
    definitionId: string,
    kitSize: number,
): boolean =>
{
    if (kit.length >= kitSize)
    {
        return false;
    }

    const pool = SKIRMISH_KIT_POOL.find((entry) => entry.definitionId === definitionId);

    if (!pool)
    {
        return false;
    }

    return countKitCopies(kit, definitionId) < pool.maxCopies;
};
