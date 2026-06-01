import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { TowerUpgradeDefinition } from '../config/towerUpgradeCatalog';
import { TOWER_UPGRADE_CATALOG } from '../config/towerUpgradeCatalog';
import {
    getTowerStatUpgradeCost,
    getTowerStatUpgradeDefinition,
    isStatUpgradeAvailableForArchetype,
} from '../config/towerStatUpgradeCatalog';
import type { GameState } from './GameState';
import type { TowerState } from './TowerState';
import { rollWaveUpgradeChoiceIds } from './waveUpgradeDraft';

export class TowerUpgradeService
{
    private readonly discardedCatalogIds = new Set<string>();

    reset (): void
    {
        this.discardedCatalogIds.clear();
    }

    isBetweenWaves (state: GameState, livingEnemyCount: number): boolean
    {
        return state.canStartWave
            && !state.upgradePick
            && livingEnemyCount === 0;
    }

    getUnusedCatalogUpgrades (towers: readonly TowerState[]): TowerUpgradeDefinition[]
    {
        const used = new Set<string>();

        for (const tower of towers)
        {
            for (const u of tower.equippedUpgrades)
            {
                used.add(u.id);
            }
        }

        return TOWER_UPGRADE_CATALOG.filter(
            (d) => !used.has(d.id) && !this.discardedCatalogIds.has(d.id),
        );
    }

    publishInventorySnapshot (towers: readonly TowerState[]): void
    {
        EventBus.emit(GAME_EVENTS.INVENTORY_SNAPSHOT, {
            unused: this.getUnusedCatalogUpgrades(towers),
        });
    }

    equipCatalogUpgrade (
        towers: readonly TowerState[],
        towerId: string,
        upgradeId: string,
    ): boolean
    {
        const tower = towers.find((t) => t.id === towerId);

        if (!tower)
        {
            return false;
        }

        const unusedIds = new Set(this.getUnusedCatalogUpgrades(towers).map((d) => d.id));

        if (!unusedIds.has(upgradeId))
        {
            return false;
        }

        if (!tower.equipUpgrade(upgradeId))
        {
            return false;
        }

        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());
        this.publishInventorySnapshot(towers);

        return true;
    }

    claimWaveReward (state: GameState, upgradeId: string): boolean
    {
        const pick = state.upgradePick;

        if (!pick || !pick.choices.includes(upgradeId))
        {
            return false;
        }

        for (const id of pick.choices)
        {
            if (id !== upgradeId)
            {
                this.discardedCatalogIds.add(id);
            }
        }

        return this.finishWaveRewardDraft(state);
    }

    /** Skip the wave reward; all offered choices are removed from the pool. */
    discardWaveReward (state: GameState): boolean
    {
        const pick = state.upgradePick;

        if (!pick)
        {
            return false;
        }

        for (const id of pick.choices)
        {
            this.discardedCatalogIds.add(id);
        }

        return this.finishWaveRewardDraft(state);
    }

    private finishWaveRewardDraft (state: GameState): boolean
    {
        state.setUpgradePick(null);
        state.setCanStartWave(true);

        return true;
    }

    offerPostWaveDraft (state: GameState, towers: readonly TowerState[]): void
    {
        const equippedIds = towers.flatMap((t) => t.equippedUpgrades.map((u) => u.id));
        const choices = rollWaveUpgradeChoiceIds(equippedIds);

        if (choices.length === 0)
        {
            state.setCanStartWave(true);

            return;
        }

        state.setUpgradePick({ choices });
        state.setCanStartWave(false);
    }

    purchaseStatUpgrade (
        state: GameState,
        towers: readonly TowerState[],
        towerId: string,
        upgradeId: string,
        livingEnemyCount: number,
    ): boolean
    {
        if (!this.isBetweenWaves(state, livingEnemyCount))
        {
            return false;
        }

        const tower = towers.find((t) => t.id === towerId);

        if (!tower)
        {
            return false;
        }

        const def = getTowerStatUpgradeDefinition(upgradeId);

        if (!def || !isStatUpgradeAvailableForArchetype(def, tower.profile.archetype))
        {
            return false;
        }

        const level = tower.getStatUpgradeLevel(upgradeId);

        if (def.maxLevel !== undefined && level >= def.maxLevel)
        {
            return false;
        }

        const cost = getTowerStatUpgradeCost(def, level);

        if (!state.spendGold(cost))
        {
            return false;
        }

        if (!tower.purchaseStatUpgrade(upgradeId))
        {
            state.addGold(cost);

            return false;
        }

        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());

        return true;
    }
}
