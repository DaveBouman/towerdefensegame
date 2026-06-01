import { TOWER_UPGRADE_CATALOG } from '../config/towerUpgradeCatalog';

/** Picks draft choices from the catalog, excluding ids discarded from prior drafts. */
export const rollWaveUpgradeChoiceIds = (excludedIds: readonly string[]): string[] =>
{
    const excluded = new Set(excludedIds);
    const pool = TOWER_UPGRADE_CATALOG.map((d) => d.id).filter((id) => !excluded.has(id));

    if (pool.length === 0)
    {
        return [];
    }

    const copy = [ ...pool ];

    for (let i = copy.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));

        [ copy[i], copy[j] ] = [ copy[j]!, copy[i]! ];
    }

    return copy.slice(0, Math.min(3, copy.length));
};
