import { parseCatalogColor } from './catalogColor';
import { NEXUS_RANGE_TILES } from './nexusCombatScaling';

/** Matches enemy-nexus combat stats in enemies.json. */
export const PLAYER_NEXUS_CONFIG = {
    unitType: 'Your Nexus',
    maxHealth: 800,
    range: NEXUS_RANGE_TILES,
    attacksPerSecond: 0.6,
    sizeScale: 1.15,
    color: parseCatalogColor('#3498db'),
} as const;
