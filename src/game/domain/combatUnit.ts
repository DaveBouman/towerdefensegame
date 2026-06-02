import type { WorldPosition } from '../grid/types';

export type CombatSide = 'player' | 'enemy';

export interface CombatUnit
{
    readonly id: string;
    readonly side: CombatSide;
    readonly position: WorldPosition;
    readonly bodyHalfWidth: number;
    readonly bodyHalfHeight: number;
    readonly health: number;
    readonly maxHealth: number;
    readonly damage: number;
    readonly defense: number;
    readonly range: number;
    readonly attacksPerSecond: number;
    readonly moveSpeedPerTick: number;
    readonly skills: readonly string[];
    readonly kamikazeExplosionRadiusTiles: number;
}

