/** Deltas on profile stats. New stat = add key here + in `MODIFIER_KEYS` below. */
export interface TowerUpgradeModifiers {
    range?: number;
    damage?: number;
    defense?: number;
    maxHealth?: number;
    attacksPerSecond?: number;
    moveSpeedPerTick?: number;
    goldValue?: number;
}

export interface TowerUpgradeDefinition {
    id: string;
    name: string;
    description?: string;
    modifiers: TowerUpgradeModifiers;
}

export type TowerEquippedUpgrade = Pick<TowerUpgradeDefinition, 'id' | 'name' | 'description'>;

const MODIFIER_KEYS: (keyof TowerUpgradeModifiers)[] = [
    'range', 'damage', 'defense', 'maxHealth', 'attacksPerSecond', 'moveSpeedPerTick', 'goldValue',
];

export const TOWER_UPGRADE_CATALOG: readonly TowerUpgradeDefinition[] = [
    { id: 'boots-of-speed', name: 'Boots of Speed', description: 'Move faster.', modifiers: { moveSpeedPerTick: 4 } },
    { id: 'hands-of-fire', name: 'Hands of Fire', description: 'More damage.', modifiers: { damage: 3 } },
    { id: 'spyglass', name: 'Spyglass', description: 'More range.', modifiers: { range: 0.5 } },
    { id: 'bracers-of-haste', name: 'Bracers of Haste', description: 'Attack faster.', modifiers: { attacksPerSecond: 0.25 } },
    { id: 'gilded-plating', name: 'Gilded Plating', description: 'Tankier, worth more gold.', modifiers: { maxHealth: 40, goldValue: 5 } },
];

const STAT_LABEL: Record<keyof TowerUpgradeModifiers, string> = {
    range: 'Range',
    damage: 'Damage',
    defense: 'Armor',
    maxHealth: 'Max HP',
    attacksPerSecond: 'Attack speed',
    moveSpeedPerTick: 'Move speed',
    goldValue: 'Kill bounty',
};

const formatStatValue = (key: keyof TowerUpgradeModifiers, value: number): string =>
{
    if (key === 'range' || key === 'attacksPerSecond')
    {
        const s = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);

        return key === 'range' ? `${s} tiles` : `${s}/s`;
    }

    if (key === 'moveSpeedPerTick')
    {
        return `${value} px/tick`;
    }

    return String(value);
};

/** Lines shown on upgrade hover (native tooltip). */
export const formatTowerUpgradeStatsTooltip = (m: TowerUpgradeModifiers): string =>
    MODIFIER_KEYS.flatMap((key) =>
    {
        const raw = m[key];

        if (raw === undefined)
        {
            return [];
        }

        const sign = raw > 0 ? '+' : '';
        const label = STAT_LABEL[key];
        const value = formatStatValue(key, raw);

        return [ `${label}: ${sign}${value}` ];
    }).join('\n');

export const towerUpgradeHoverText = (def: TowerUpgradeDefinition): string =>
    [ def.name, formatTowerUpgradeStatsTooltip(def.modifiers), def.description ]
        .filter((line): line is string => Boolean(line && line.trim()))
        .join('\n');

const byId = new Map(TOWER_UPGRADE_CATALOG.map((d) => [ d.id, d ]));

export const getTowerUpgradeDefinition = (id: string): TowerUpgradeDefinition | undefined =>
    byId.get(id);

export const mergeTowerUpgradeModifiers = (ids: readonly string[]): TowerUpgradeModifiers =>
{
    const out: TowerUpgradeModifiers = {};

    for (const id of ids)
    {
        const def = byId.get(id);

        if (!def)
        {
            continue;
        }

        for (const key of MODIFIER_KEYS)
        {
            const delta = def.modifiers[key];

            if (delta !== undefined)
            {
                out[key] = (out[key] ?? 0) + delta;
            }
        }
    }

    return out;
};
