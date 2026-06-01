import { getNexusDamageForWave } from '../../config/nexusCombatScaling';
import { GRID_CONFIG } from '../../config/gridConfig';
import { formatAttacksPerSecond } from '../../config/gameClockConfig';
import type { EnemyStateSnapshot } from '../types';
import type { DamageType } from '../combat/types';
import { worldToTileLabel } from '../../grid/worldPosition';
import { buildStatRows, type DisplayStat, type StatField } from './displayStat';

const formatLabel = (key: string): string =>
    key.charAt(0).toUpperCase() + key.slice(1);

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

interface EnemyDisplayContext
{
    enemy: EnemyStateSnapshot;
    resistances: [ DamageType, number ][];
    /** Current wave (used for enemy nexus damage scaling in the UI). */
    wave: number;
}

const ENEMY_STAT_FIELDS: readonly StatField<EnemyDisplayContext>[] = [
    {
        label: 'Health',
        show: () => true,
        format: ({ enemy }) => `${enemy.health} / ${enemy.stats.maxHealth}`,
    },
    {
        label: 'Damage',
        show: () => true,
        format: ({ enemy, wave }) =>
        {
            if (enemy.isNexus)
            {
                const effectiveWave = Math.max(1, wave);

                return `${getNexusDamageForWave(effectiveWave)} (wave ${effectiveWave})`;
            }

            return String(enemy.stats.damage);
        },
    },
    {
        label: 'Gold',
        show: () => true,
        format: ({ enemy }) => String(enemy.stats.goldValue),
    },
    {
        label: 'Kill gold',
        show: ({ enemy }) => enemy.stats.killGold > 0,
        format: ({ enemy }) => String(enemy.stats.killGold),
    },
    {
        label: 'Attack speed',
        show: () => true,
        format: ({ enemy }) => formatAttacksPerSecond(enemy.stats.attacksPerSecond),
    },
    {
        label: 'Defense',
        show: () => true,
        format: ({ enemy }) => String(enemy.stats.defense),
    },
    {
        label: 'Range',
        show: () => true,
        format: ({ enemy }) => `${enemy.stats.range} tiles`,
    },
    {
        label: 'Tile',
        show: () => true,
        format: ({ enemy }) => worldToTileLabel(GRID_CONFIG, enemy.position),
    },
];

export const getEnemyStatRows = (enemy: EnemyStateSnapshot, wave = 0): DisplayStat[] =>
{
    const resistances = Object.entries(enemy.stats.resistances) as [ DamageType, number ][];

    return buildStatRows({ enemy, resistances, wave }, ENEMY_STAT_FIELDS);
};

export const getEnemyResistanceTags = (enemy: EnemyStateSnapshot): string[] =>
{
    const resistances = Object.entries(enemy.stats.resistances) as [ DamageType, number ][];

    return resistances.map(([ element, value ]) =>
        `${formatLabel(element)} ${formatPercent(value)}`);
};

export const getEnemyPerkTags = (enemy: EnemyStateSnapshot): string[] =>
    enemy.stats.perkIds;
