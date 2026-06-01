import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { GRID_CONFIG } from '../config/gridConfig';
import { GameState } from './GameState';
import { TowerUpgradeService } from './TowerUpgradeService';
import { createTowerState } from './createTowerState';
import { Grid } from '../grid/Grid';

describe('TowerUpgradeService', () =>
{
    let service: TowerUpgradeService;
    let state: GameState;
    const grid = new Grid(GRID_CONFIG);

    beforeEach(() =>
    {
        service = new TowerUpgradeService();
        state = new GameState();
        service.reset();
    });

    it('claiming a wave reward adds the item to inventory stash', () =>
    {
        state.setUpgradePick({ choices: [ 'spyglass', 'gilded-plating', 'bracers-of-haste' ] });

        expect(service.claimWaveReward(state, 'spyglass')).toBe(true);

        const inventory = service.getInventoryUpgrades();

        expect(inventory.map((d) => d.id)).toEqual([ 'spyglass' ]);
        expect(state.canStartWave).toBe(true);
        expect(state.upgradePick).toBeNull();
    });

    it('discarding a wave reward leaves inventory empty', () =>
    {
        state.setUpgradePick({ choices: [ 'spyglass', 'gilded-plating' ] });

        expect(service.discardWaveReward(state)).toBe(true);

        expect(service.getInventoryUpgrades()).toHaveLength(0);
        expect(state.canStartWave).toBe(true);
        expect(state.upgradePick).toBeNull();
    });

    it('lets two towers equip the same catalog upgrade from separate stash copies', () =>
    {
        const claimGilded = (): void =>
        {
            state.setUpgradePick({ choices: [ 'gilded-plating' ] });
            service.claimWaveReward(state, 'gilded-plating');
        };

        claimGilded();
        claimGilded();

        const towerA = createTowerState(grid, { col: 1, row: 30 }, 'close');
        const towerB = createTowerState(grid, { col: 3, row: 30 }, 'close');

        expect(
            service.equipCatalogUpgrade([ towerA, towerB ], towerA.id, 'gilded-plating'),
        ).toBe(true);
        expect(
            service.equipCatalogUpgrade([ towerA, towerB ], towerB.id, 'gilded-plating'),
        ).toBe(true);
        expect(towerA.equippedUpgrades.some((u) => u.id === 'gilded-plating')).toBe(true);
        expect(towerB.equippedUpgrades.some((u) => u.id === 'gilded-plating')).toBe(true);
        expect(service.getInventoryUpgrades()).toHaveLength(0);
    });
});
