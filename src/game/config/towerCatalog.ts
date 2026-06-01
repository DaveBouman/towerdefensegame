import type { TowerProfile } from '../domain/towers/types';
import { TOWER_MOVE_SPEED_PER_TICK } from './towerProfiles';

export type TowerTier = 1 | 2 | 3 | 4 | 5;

export type TowerDefinitionId =
    | 'militia'
    | 'scout'
    | 'guard'
    | 'archer'
    | 'bruiser'
    | 'sharpshooter'
    | 'juggernaut'
    | 'siege'
    | 'champion'
    | 'obliterator';

export interface TowerDefinition {
    id: TowerDefinitionId;
    tier: TowerTier;
    profile: TowerProfile;
}

const profile = (
    archetype: TowerProfile['archetype'],
    unitType: string,
    tier: TowerTier,
    stats: Pick<TowerProfile, 'range' | 'damage' | 'maxHealth' | 'attacksPerSecond' | 'color'>,
): TowerProfile => ({
    archetype,
    unitType,
    range: stats.range,
    damage: stats.damage,
    maxHealth: stats.maxHealth,
    attacksPerSecond: stats.attacksPerSecond,
    color: stats.color,
    isMobile: true,
    moveSpeedPerTick: TOWER_MOVE_SPEED_PER_TICK,
    sizeScale: 0.75,
    weaknesses: [],
    goldValue: 20 + tier * 8,
});

export const TOWER_DEFINITIONS: readonly TowerDefinition[] = [
    {
        id: 'militia',
        tier: 1,
        profile: profile('close', 'Militia', 1, {
            range: 1.1,
            damage: 10,
            maxHealth: 160,
            attacksPerSecond: 1,
            color: 0x6bcb77,
        }),
    },
    {
        id: 'scout',
        tier: 1,
        profile: profile('long', 'Scout', 1, {
            range: 3.25,
            damage: 4,
            maxHealth: 110,
            attacksPerSecond: 0.75,
            color: 0x5dade2,
        }),
    },
    {
        id: 'guard',
        tier: 2,
        profile: profile('close', 'Guard', 2, {
            range: 1.2,
            damage: 12,
            maxHealth: 200,
            attacksPerSecond: 1.05,
            color: 0x2ecc71,
        }),
    },
    {
        id: 'archer',
        tier: 2,
        profile: profile('long', 'Archer', 2, {
            range: 3.75,
            damage: 5,
            maxHealth: 125,
            attacksPerSecond: 0.8,
            color: 0x3498db,
        }),
    },
    {
        id: 'bruiser',
        tier: 3,
        profile: profile('close', 'Bruiser', 3, {
            range: 1.25,
            damage: 14,
            maxHealth: 220,
            attacksPerSecond: 1.1,
            color: 0x27ae60,
        }),
    },
    {
        id: 'sharpshooter',
        tier: 3,
        profile: profile('long', 'Sharpshooter', 3, {
            range: 4,
            damage: 6,
            maxHealth: 140,
            attacksPerSecond: 0.85,
            color: 0x2980b9,
        }),
    },
    {
        id: 'juggernaut',
        tier: 4,
        profile: profile('close', 'Juggernaut', 4, {
            range: 1.15,
            damage: 16,
            maxHealth: 280,
            attacksPerSecond: 0.95,
            color: 0x1e8449,
        }),
    },
    {
        id: 'siege',
        tier: 4,
        profile: profile('long', 'Siege Tower', 4, {
            range: 4.5,
            damage: 8,
            maxHealth: 155,
            attacksPerSecond: 0.75,
            color: 0x1f618d,
        }),
    },
    {
        id: 'champion',
        tier: 5,
        profile: profile('close', 'Champion', 5, {
            range: 1.35,
            damage: 18,
            maxHealth: 300,
            attacksPerSecond: 1.2,
            color: 0xf1c40f,
        }),
    },
    {
        id: 'obliterator',
        tier: 5,
        profile: profile('long', 'Obliterator', 5, {
            range: 4.75,
            damage: 9,
            maxHealth: 165,
            attacksPerSecond: 0.9,
            color: 0x8e44ad,
        }),
    },
];

const byId = new Map(TOWER_DEFINITIONS.map((d) => [ d.id, d ]));

export const getTowerDefinition = (id: TowerDefinitionId): TowerDefinition | undefined =>
    byId.get(id);

export const getTowerDefinitionLabel = (id: TowerDefinitionId): string =>
    getTowerDefinition(id)?.profile.unitType ?? id;

export const tierLabel = (tier: TowerTier): string => `Tier ${tier}`;
