import type { TowerProfile } from './towers/types';
import type { TowerEquippedUpgrade } from '../config/towerUpgradeCatalog';
import {
    mergeTowerUpgradeModifiers,
    getTowerUpgradeDefinition,
    type TowerUpgradeModifiers,
} from '../config/towerUpgradeCatalog';
import {
    computeStatUpgradeModifiers,
    getTowerStatUpgradeDefinition,
    isStatUpgradeAvailableForArchetype,
    mergeTowerUpgradeModifierMaps,
} from '../config/towerStatUpgradeCatalog';
import { bodyHalfExtent } from '../config/entityBodies';
import type { Grid } from '../grid/Grid';
import type { GridPosition, WorldPosition } from '../grid/types';
import { tileCenterWorld } from '../grid/worldPosition';
import type { TowerStateSnapshot } from './types';

let nextTowerId = 0;

export class TowerState
{
    readonly id: string;
    readonly profile: TowerProfile;
    readonly spawnTile: GridPosition;
    readonly bodyHalfWidth: number;
    readonly bodyHalfHeight: number;
    position: WorldPosition;
    health: number;
    private equippedUpgradeIds: string[];
    private readonly statUpgradeLevels = new Map<string, number>();
    private bonus: TowerUpgradeModifiers;

    constructor (
        grid: Grid,
        spawnTile: GridPosition,
        profile: TowerProfile,
        equippedUpgradeIds: readonly string[] = [],
    )
    {
        this.id = `tower-${nextTowerId++}`;
        this.profile = profile;
        this.spawnTile = { ...spawnTile };
        this.position = tileCenterWorld(grid.config, spawnTile);
        this.equippedUpgradeIds = [ ...equippedUpgradeIds ];
        this.refreshModifiers();
        this.health = this.maxHealth;
        const half = bodyHalfExtent(grid.config, profile.sizeScale);

        this.bodyHalfWidth = half;
        this.bodyHalfHeight = half;
    }

    private refreshModifiers (): void
    {
        const catalogBonus = mergeTowerUpgradeModifiers(this.equippedUpgradeIds);
        const statBonus = computeStatUpgradeModifiers(this.statUpgradeLevels, this.profile.archetype);

        this.bonus = mergeTowerUpgradeModifierMaps(catalogBonus, statBonus);
    }

    getStatUpgradeLevel (upgradeId: string): number
    {
        return this.statUpgradeLevels.get(upgradeId) ?? 0;
    }

    purchaseStatUpgrade (upgradeId: string): boolean
    {
        const def = getTowerStatUpgradeDefinition(upgradeId);

        if (!def || !isStatUpgradeAvailableForArchetype(def, this.profile.archetype))
        {
            return false;
        }

        const level = this.getStatUpgradeLevel(upgradeId);

        if (def.maxLevel !== undefined && level >= def.maxLevel)
        {
            return false;
        }

        const previousMax = this.maxHealth;

        this.statUpgradeLevels.set(upgradeId, level + 1);
        this.refreshModifiers();

        if (def.stat === 'maxHealth')
        {
            this.health = Math.min(this.health + (this.maxHealth - previousMax), this.maxHealth);
        }

        return true;
    }

    get maxHealth (): number
    {
        return this.profile.maxHealth + (this.bonus.maxHealth ?? 0);
    }

    get range (): number
    {
        return this.profile.range + (this.bonus.range ?? 0);
    }

    get damage (): number
    {
        return this.profile.damage + (this.bonus.damage ?? 0);
    }

    get attacksPerSecond (): number
    {
        return this.profile.attacksPerSecond + (this.bonus.attacksPerSecond ?? 0);
    }

    get moveSpeedPerTick (): number
    {
        return this.profile.moveSpeedPerTick + (this.bonus.moveSpeedPerTick ?? 0);
    }

    get goldValue (): number
    {
        return this.profile.goldValue + (this.bonus.goldValue ?? 0);
    }

    equipUpgrade (upgradeId: string): boolean
    {
        if (!getTowerUpgradeDefinition(upgradeId) || this.equippedUpgradeIds.includes(upgradeId))
        {
            return false;
        }

        const previousMax = this.maxHealth;

        this.equippedUpgradeIds.push(upgradeId);
        this.refreshModifiers();
        this.health = Math.min(this.health + (this.maxHealth - previousMax), this.maxHealth);

        return true;
    }

    get equippedUpgrades (): TowerEquippedUpgrade[]
    {
        return this.equippedUpgradeIds.flatMap((id) =>
        {
            const def = getTowerUpgradeDefinition(id);

            return def ? [ { id: def.id, name: def.name, description: def.description } ] : [];
        });
    }

    get unitType (): string
    {
        return this.profile.unitType;
    }

    get isMobile (): boolean
    {
        return this.profile.isMobile;
    }

    applyDamage (amount: number): number
    {
        const damage = Math.max(0, amount);

        this.health = Math.max(0, this.health - damage);

        return damage;
    }

    resetForNextWave (grid: Grid): void
    {
        this.health = this.maxHealth;
        this.position = tileCenterWorld(grid.config, this.spawnTile);
    }

    snapshot (): TowerStateSnapshot
    {
        return {
            id: this.id,
            position: { ...this.position },
            unitType: this.profile.unitType,
            archetype: this.profile.archetype,
            range: this.range,
            damage: this.damage,
            health: this.health,
            maxHealth: this.maxHealth,
            attacksPerSecond: this.attacksPerSecond,
            moveSpeedPerTick: this.moveSpeedPerTick,
            isMobile: this.profile.isMobile,
            goldValue: this.goldValue,
            weaknesses: [ ...this.profile.weaknesses ],
            equippedUpgrades: this.equippedUpgrades,
            statUpgradeLevels: Object.fromEntries(this.statUpgradeLevels),
        };
    }
}
