import { PLAYER_NEXUS_CONFIG } from '../config/playerNexusConfig';
import { bodyHalfExtent } from '../config/entityBodies';
import { GRID_CONFIG } from '../config/gridConfig';
import type { WorldPosition } from '../grid/types';
import { tileCenterWorld } from '../grid/worldPosition';
import type { GridPosition } from '../grid/types';
import type { PlayerNexusStateSnapshot } from './types';

export class PlayerNexusState
{
    readonly id = 'player-nexus';
    readonly unitType = PLAYER_NEXUS_CONFIG.unitType;
    readonly bodyHalfWidth: number;
    readonly bodyHalfHeight: number;
    readonly maxHealth = PLAYER_NEXUS_CONFIG.maxHealth;
    position: WorldPosition;
    health: number;

    constructor (spawnTile: GridPosition)
    {
        this.bodyHalfWidth = bodyHalfExtent(GRID_CONFIG, PLAYER_NEXUS_CONFIG.sizeScale);
        this.bodyHalfHeight = this.bodyHalfWidth;
        this.position = tileCenterWorld(GRID_CONFIG, spawnTile);
        this.health = this.maxHealth;
    }

    applyDamage (amount: number): number
    {
        const damage = Math.max(0, amount);

        this.health = Math.max(0, this.health - damage);

        return damage;
    }

    snapshot (): PlayerNexusStateSnapshot
    {
        return {
            id: this.id,
            position: { ...this.position },
            unitType: this.unitType,
            health: this.health,
            maxHealth: this.maxHealth,
        };
    }
}
