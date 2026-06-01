import { getNexusDamageForWave } from '../../config/nexusCombatScaling';
import { formatAttacksPerSecond } from '../../config/gameClockConfig';
import type { PlayerNexusStateSnapshot } from '../types';
import { buildStatRows, type DisplayStat, type StatField } from './displayStat';

interface PlayerNexusDisplayContext
{
    nexus: PlayerNexusStateSnapshot;
    wave: number;
}

const PLAYER_NEXUS_STAT_FIELDS: readonly StatField<PlayerNexusDisplayContext>[] = [
    {
        label: 'Health',
        show: () => true,
        format: ({ nexus }) => `${nexus.health} / ${nexus.maxHealth}`,
    },
    {
        label: 'Damage',
        show: () => true,
        format: ({ wave }) =>
        {
            const effectiveWave = Math.max(1, wave);

            return `${getNexusDamageForWave(effectiveWave)} (wave ${effectiveWave})`;
        },
    },
    {
        label: 'Attack speed',
        show: () => true,
        format: ({ nexus }) => formatAttacksPerSecond(nexus.attacksPerSecond),
    },
    {
        label: 'Range',
        show: () => true,
        format: ({ nexus }) => `${nexus.range} tiles`,
    },
];

export const getPlayerNexusStatRows = (
    nexus: PlayerNexusStateSnapshot,
    wave = 0,
): DisplayStat[] =>
    buildStatRows({ nexus, wave }, PLAYER_NEXUS_STAT_FIELDS);
