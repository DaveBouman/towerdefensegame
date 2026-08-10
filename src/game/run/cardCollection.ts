import {
    CARD_DEFINITIONS,
    getCardArchetypeBaseId,
    getCardDefinition,
    getCardDefinitionOrThrow,
    type CardDefinition,
    type CardTier,
} from '../cardGame/config/cardRegistry';
import { getDefaultDeckDefinitionIds } from '../cardGame/domain/buildPlayerDeck';
import { REWARD_CARD_POOL } from './rewards';

const STORAGE_KEY = 'signal-chain-card-collection';

/** Cards excluded from the collectible index (hazards, curses, dormant systems). */
const EXCLUDED_COLLECTION_IDS = new Set([
    'hazard',
    'boost',
    'loop-reset',
    'burden',
    'fuse',
]);

export interface CollectionCardEntry {
    id: string;
    label: string;
    power: number;
    behaviorId: string;
    visualId: string;
    tier: CardTier;
    unlocked: boolean;
}

const isCollectibleBase = (definition: CardDefinition): boolean =>
{
    if (definition.upgradeOf)
    {
        return false;
    }

    if (EXCLUDED_COLLECTION_IDS.has(definition.id))
    {
        return false;
    }

    return REWARD_CARD_POOL.includes(definition.id)
        || getDefaultDeckDefinitionIds().includes(definition.id);
};

/** Stable collectible catalog — base reward/starter cards only. */
export const getCollectionCatalogIds = (): readonly string[] =>
{
    const ids = CARD_DEFINITIONS
        .filter(isCollectibleBase)
        .map((definition) => definition.id);

    return [ ...new Set(ids) ].sort((a, b) =>
    {
        const left = getCardDefinitionOrThrow(a);
        const right = getCardDefinitionOrThrow(b);

        if (left.tier !== right.tier)
        {
            return left.tier - right.tier;
        }

        return left.label.localeCompare(right.label);
    });
};

export const readUnlockedCardIds = (): Set<string> =>
{
    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw)
        {
            return new Set();
        }

        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed))
        {
            return new Set();
        }

        return new Set(
            parsed.filter((id): id is string => typeof id === 'string' && Boolean(getCardDefinition(id))),
        );
    }
    catch
    {
        return new Set();
    }
};

const writeUnlockedCardIds = (ids: Set<string>): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([ ...ids ].sort()));
    }
    catch
    {
        // Ignore private-mode / blocked storage.
    }
};

/** Normalizes any definition id to its collectible base form when possible. */
export const toCollectionCardId = (definitionId: string): string | null =>
{
    const baseId = getCardArchetypeBaseId(definitionId);
    const definition = getCardDefinition(baseId);

    if (!definition || !isCollectibleBase(definition))
    {
        return null;
    }

    return baseId;
};

/** Marks cards as unlocked. Returns how many were newly added. */
export const unlockCards = (definitionIds: readonly string[]): number =>
{
    const unlocked = readUnlockedCardIds();
    let added = 0;

    for (const definitionId of definitionIds)
    {
        const collectionId = toCollectionCardId(definitionId);

        if (!collectionId || unlocked.has(collectionId))
        {
            continue;
        }

        unlocked.add(collectionId);
        added += 1;
    }

    if (added > 0)
    {
        writeUnlockedCardIds(unlocked);
    }

    return added;
};

/** Ensures starter-deck cards are always unlocked. */
export const ensureStarterCollectionUnlocks = (): number =>
    unlockCards([ ...new Set(getDefaultDeckDefinitionIds()) ]);

export const getCollectionEntries = (): CollectionCardEntry[] =>
{
    const unlocked = readUnlockedCardIds();

    return getCollectionCatalogIds().map((id) =>
    {
        const definition = getCardDefinitionOrThrow(id);

        return {
            id,
            label: definition.label,
            power: definition.power,
            behaviorId: definition.behaviorId,
            visualId: definition.visualId,
            tier: definition.tier,
            unlocked: unlocked.has(id),
        };
    });
};

export const getCollectionProgress = (): { unlocked: number; total: number } =>
{
    const entries = getCollectionEntries();

    return {
        unlocked: entries.filter((entry) => entry.unlocked).length,
        total: entries.length,
    };
};
