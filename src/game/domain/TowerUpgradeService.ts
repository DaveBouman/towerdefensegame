import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { TowerUpgradeDefinition } from '../config/towerUpgradeCatalog';
import {
    getTowerUpgradeDefinition,
} from '../config/towerUpgradeCatalog';
import {
    getTowerStatUpgradeCost,
    getTowerStatUpgradeDefinition,
    isStatUpgradeAvailableForArchetype,
} from '../config/towerStatUpgradeCatalog';
import type { GameState } from './GameState';
import type { TowerState } from './TowerState';
import { isBetweenWaves } from './gamePhase';
import { rollWaveUpgradeChoiceIds } from './waveUpgradeDraft';

export class TowerUpgradeService
{
    /** Upgrade ids won from drafts but not yet dragged onto a tower. */
    private readonly stash: string[] = [];
    private readonly discardedCatalogIds = new Set<string>();

    reset (): void
    {
        this.stash.length = 0;
        this.discardedCatalogIds.clear();
    }

    /** Items in inventory waiting to be equipped (each tower keeps its own equipped list). */
    getInventoryUpgrades (): TowerUpgradeDefinition[]
    {
        return this.stash.flatMap((id) =>
        {
            const def = getTowerUpgradeDefinition(id);

            return def ? [ def ] : [];
        });
    }

    publishInventorySnapshot (): void
    {
        EventBus.emit(GAME_EVENTS.INVENTORY_SNAPSHOT, {
            unused: this.getInventoryUpgrades(),
        });
    }

    equipCatalogUpgrade (
        state: GameState,
        towers: readonly TowerState[],
        towerId: string,
        upgradeId: string,
        livingEnemyCount: number,
    ): boolean
    {
        if (!isBetweenWaves(state, livingEnemyCount))
        {
            return false;
        }

        const stashIndex = this.stash.indexOf(upgradeId);

        if (stashIndex === -1)
        {
            return false;
        }

        const tower = towers.find((t) => t.id === towerId);

        if (!tower)
        {
            return false;
        }

        if (!tower.equipUpgrade(upgradeId))
        {
            return false;
        }

        this.stash.splice(stashIndex, 1);
        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());
        this.publishInventorySnapshot();

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

        this.stash.push(upgradeId);

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

    offerPostWaveDraft (state: GameState): void
    {
        if (state.upgradePick)
        {
            return;
        }

        const choices = rollWaveUpgradeChoiceIds([ ...this.discardedCatalogIds ]);

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
        if (!isBetweenWaves(state, livingEnemyCount))
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
