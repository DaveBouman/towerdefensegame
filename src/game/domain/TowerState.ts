import type { TowerDefinitionId } from '../config/towerCatalog';
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
import { computeKillRatingModifiers } from '../config/towerKillRating';
import { bodyHalfExtent } from '../config/entityBodies';
import type { Grid } from '../grid/Grid';
import type { GridPosition, WorldPosition } from '../grid/types';
import { tileCenterWorld } from '../grid/worldPosition';
import type { TowerTargetingMode } from '../combat/towerTargeting';
import { getTowerFusionStatMultiplier } from '../config/towerFusionConfig';
import type { TowerStateSnapshot } from './types';
import type { TowerRace } from './towers/types';
import type { CombatSide } from './combatUnit';
import type { ArmorByType, DamageType } from './combat/types';

let nextTowerId = 0;

export class TowerState
{
    readonly id: string;
    readonly definitionId: TowerDefinitionId;
    readonly profile: TowerProfile;
    private _spawnTile: GridPosition;

    get spawnTile (): GridPosition
    {
        return this._spawnTile;
    }
    readonly bodyHalfWidth: number;
    readonly bodyHalfHeight: number;
    position: WorldPosition;
    health: number;
    experience = 0;
    killCount = 0;
    private equippedUpgradeIds: string[];
    private readonly statUpgradeLevels = new Map<string, number>();
    private bonus: TowerUpgradeModifiers;
    private auraBonus: TowerUpgradeModifiers = {};
    private raceAuraTags: string[] = [];
    private _targetingMode: TowerTargetingMode = 'nearest';
    private fusionStatMultiplier = 1;
    private _fusionGroupSize = 1;

    constructor (
        grid: Grid,
        spawnTile: GridPosition,
        definitionId: TowerDefinitionId,
        profile: TowerProfile,
        equippedUpgradeIds: readonly string[] = [],
    )
    {
        this.id = `tower-${nextTowerId++}`;
        this.definitionId = definitionId;
        this.profile = profile;
        this._spawnTile = { ...spawnTile };
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
        const killBonus = computeKillRatingModifiers(this.killCount, this.profile.killRating);

        this.bonus = mergeTowerUpgradeModifierMaps(
            mergeTowerUpgradeModifierMaps(catalogBonus, statBonus),
            killBonus,
        );
    }

    getStatUpgradeLevel (upgradeId: string): number
    {
        return this.statUpgradeLevels.get(upgradeId) ?? 0;
    }

    grantExperience (amount: number): void
    {
        if (amount > 0)
        {
            this.experience += amount;
        }
    }

    get fusionGroupSize (): number
    {
        return this._fusionGroupSize;
    }

    completeFusion (groupSize: number, victims: readonly TowerState[]): void
    {
        for (const victim of victims)
        {
            this.experience += victim.experience;
            this.killCount += victim.killCount;
        }

        if (victims.length > 0)
        {
            this.refreshModifiers();
        }

        const previousMax = this.maxHealth;
        const previousHealth = this.health;

        this._fusionGroupSize = groupSize;
        this.fusionStatMultiplier = getTowerFusionStatMultiplier(groupSize);

        const newMax = this.maxHealth;

        this.health = previousMax > 0
            ? Math.min(previousHealth * (newMax / previousMax), newMax)
            : newMax;
    }

    recordKill (killExp: number): void
    {
        const previousMax = this.maxHealth;

        this.killCount += 1;
        this.grantExperience(killExp);
        this.refreshModifiers();

        const maxGain = this.maxHealth - previousMax;

        if (maxGain > 0)
        {
            this.health = Math.min(this.health + maxGain, this.maxHealth);
        }
    }

    spendExperience (amount: number): boolean
    {
        if (amount <= 0 || this.experience < amount)
        {
            return false;
        }

        this.experience -= amount;

        return true;
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
        return this.fusedStat('maxHealth', this.profile.maxHealth);
    }

    get range (): number
    {
        return this.fusedStat('range', this.profile.range);
    }

    get damage (): number
    {
        return this.fusedStat('damage', this.profile.damage);
    }

    get damageType (): DamageType
    {
        return this.profile.damageType;
    }

    get defense (): number
    {
        return this.fusedStat('defense', this.profile.defense);
    }

    get armorByType (): ArmorByType
    {
        const delta = this.defense - this.profile.defense;

        return {
            physical: Math.max(0, this.profile.armorByType.physical + delta),
            fire: Math.max(0, this.profile.armorByType.fire + delta),
            water: Math.max(0, this.profile.armorByType.water + delta),
            earth: Math.max(0, this.profile.armorByType.earth + delta),
            air: Math.max(0, this.profile.armorByType.air + delta),
        };
    }

    get attacksPerSecond (): number
    {
        return this.profile.attacksPerSecond + this.modifier('attacksPerSecond');
    }

    get moveSpeedPerTick (): number
    {
        return this.fusedStat('moveSpeedPerTick', this.profile.moveSpeedPerTick);
    }

    get goldValue (): number
    {
        return this.fusedStat('goldValue', this.profile.goldValue);
    }

    get race (): TowerRace
    {
        return this.profile.race;
    }

    get side (): CombatSide
    {
        return 'player';
    }

    get skills (): readonly string[]
    {
        return this.profile.skills;
    }

    get kamikazeExplosionRadiusTiles (): number
    {
        return this.profile.kamikazeExplosionRadiusTiles;
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

    get targetingMode (): TowerTargetingMode
    {
        return this._targetingMode;
    }

    setTargetingMode (mode: TowerTargetingMode): void
    {
        this._targetingMode = mode;
    }

    setAuraBonus (bonus: TowerUpgradeModifiers): boolean
    {
        const previousMax = this.maxHealth;
        const same = this.sameModifiers(this.auraBonus, bonus);

        this.auraBonus = { ...bonus };

        const nextMax = this.maxHealth;

        if (nextMax > previousMax)
        {
            // Keep full-health towers full when an aura grants max HP.
            this.health = Math.min(this.health + (nextMax - previousMax), nextMax);
        }
        else
        {
            this.health = Math.min(this.health, nextMax);
        }

        return !same || nextMax !== previousMax;
    }

    setRaceAuraTags (tags: readonly string[]): boolean
    {
        if (
            tags.length === this.raceAuraTags.length
            && tags.every((tag, i) => tag === this.raceAuraTags[i])
        )
        {
            return false;
        }

        this.raceAuraTags = [ ...tags ];

        return true;
    }

    applyDamage (amount: number, type: DamageType = 'physical'): number
    {
        if (amount <= 0)
        {
            return 0;
        }

        const armor = this.armorByType[type];
        const mitigation = Math.max(0, Math.min(0.85, armor / 100));
        const weaknessMultiplier = this.profile.weaknesses.includes(type) ? 1.25 : 1;
        const damage = Math.max(1, Math.round(amount * (1 - mitigation) * weaknessMultiplier));

        this.health = Math.max(0, this.health - damage);

        return damage;
    }

    resetForNextWave (grid: Grid): void
    {
        this.health = this.maxHealth;
        this.position = tileCenterWorld(grid.config, this._spawnTile);
    }

    /** Updates home tile between waves (also moves the unit to that tile center). */
    relocateTo (grid: Grid, tile: GridPosition): void
    {
        this._spawnTile = { ...tile };
        this.position = tileCenterWorld(grid.config, tile);
    }

    snapshot (): TowerStateSnapshot
    {
        return {
            id: this.id,
            side: this.side,
            position: { ...this.position },
            unitType: this.profile.unitType,
            archetype: this.profile.archetype,
            race: this.profile.race,
            definitionId: this.definitionId,
            range: this.range,
            damage: this.damage,
            damageType: this.damageType,
            defense: this.defense,
            health: this.health,
            maxHealth: this.maxHealth,
            attacksPerSecond: this.attacksPerSecond,
            moveSpeedPerTick: this.moveSpeedPerTick,
            isMobile: this.profile.isMobile,
            goldValue: this.goldValue,
            experience: this.experience,
            kills: this.killCount,
            killRating: this.profile.killRating,
            weaknesses: [ ...this.profile.weaknesses ],
            equippedUpgrades: this.equippedUpgrades,
            statUpgradeLevels: Object.fromEntries(this.statUpgradeLevels),
            raceAuraBonus: { ...this.auraBonus },
            raceAuraTags: [ ...this.raceAuraTags ],
            targetingMode: this._targetingMode,
        };
    }

    private modifier (key: keyof TowerUpgradeModifiers): number
    {
        return (this.bonus[key] ?? 0) + (this.auraBonus[key] ?? 0);
    }

    private fusedStat (key: keyof TowerUpgradeModifiers, profileValue: number): number
    {
        return (profileValue + this.modifier(key)) * this.fusionStatMultiplier;
    }

    private sameModifiers (
        a: TowerUpgradeModifiers,
        b: TowerUpgradeModifiers,
    ): boolean
    {
        const keys: (keyof TowerUpgradeModifiers)[] = [
            'range',
            'damage',
            'defense',
            'maxHealth',
            'attacksPerSecond',
            'moveSpeedPerTick',
            'goldValue',
        ];

        return keys.every((key) => (a[key] ?? 0) === (b[key] ?? 0));
    }
}
