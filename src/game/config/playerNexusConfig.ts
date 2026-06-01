import { parseCatalogColor } from './catalogColor';

export const PLAYER_NEXUS_CONFIG = {
    unitType: 'Your Nexus',
    maxHealth: 800,
    sizeScale: 1.15,
    color: parseCatalogColor('#3498db'),
} as const;
