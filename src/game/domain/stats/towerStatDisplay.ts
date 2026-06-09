import { GRID_CONFIG } from '../../config/gridConfig';
import { formatAttacksPerSecond, TICKS_PER_SECOND } from '../../config/gameClockConfig';
import type { TowerStateSnapshot } from '../types';
import { worldToTileLabel } from '../../grid/worldPosition';
import { buildStatRows, type DisplayStat, type StatField } from './displayStat';

const formatMoveSpeed = (pixelsPerTick: number): string =>
{
    const pixelsPerSecond = Math.round(pixelsPerTick * TICKS_PER_SECOND);

    return `${pixelsPerSecond} px/s`;
};

const TOWER_STAT_FIELDS: readonly StatField<TowerStateSnapshot>[] = [
    {
        label: 'Health',
        show: () => true,
        format: (tower) => `${tower.health} / ${tower.maxHealth}`,
    },
    {
        label: 'Damage',
        show: () => true,
        format: (tower) => String(tower.damage),
    },
    {
        label: 'Armor',
        show: () => true,
        format: (tower) => String(tower.defense),
    },
    {
        label: 'Gold',
        show: () => true,
        format: (tower) => String(tower.goldValue),
    },
    {
        label: 'EXP',
        show: () => true,
        format: (tower) => String(tower.experience),
    },
    {
        label: 'Kills',
        show: () => true,
        format: (tower) => String(tower.kills),
    },
    {
        label: 'Kill rating',
        show: () => true,
        format: (tower) => `×${tower.killRating.toFixed(1)}`,
    },
    {
        label: 'Attack speed',
        show: () => true,
        format: (tower) => formatAttacksPerSecond(tower.attacksPerSecond),
    },
    {
        label: 'Range',
        show: () => true,
        format: (tower) => `${tower.range} tiles`,
    },
    {
        label: 'Move speed',
        show: () => true,
        format: (tower) => formatMoveSpeed(tower.moveSpeedPerTick),
    },
    {
        label: 'Type',
        show: () => true,
        format: (tower) => (tower.archetype === 'close' ? 'Close' : 'Long'),
    },
    {
        label: 'Tile',
        show: () => true,
        format: (tower) => worldToTileLabel(GRID_CONFIG, tower.position),
    },
];

export const getTowerStatRows = (tower: TowerStateSnapshot): DisplayStat[] =>
    buildStatRows(tower, TOWER_STAT_FIELDS);
