import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { GameState } from './GameState';
import { TowerUpgradeService } from './TowerUpgradeService';

describe('TowerUpgradeService', () =>
{
    let service: TowerUpgradeService;
    let state: GameState;

    beforeEach(() =>
    {
        service = new TowerUpgradeService();
        state = new GameState();
        service.reset();
    });

    it('claiming a wave reward discards other choices from the draft', () =>
    {
        state.setUpgradePick({ choices: [ 'spyglass', 'gilded-plating', 'bracers-of-haste' ] });

        expect(service.claimWaveReward(state, 'spyglass')).toBe(true);

        const unused = service.getUnusedCatalogUpgrades([]);

        expect(unused.some((d) => d.id === 'spyglass')).toBe(true);
        expect(unused.some((d) => d.id === 'gilded-plating')).toBe(false);
        expect(unused.some((d) => d.id === 'bracers-of-haste')).toBe(false);
        expect(state.canStartWave).toBe(true);
        expect(state.upgradePick).toBeNull();
    });

    it('discarding a wave reward removes all choices from the pool', () =>
    {
        state.setUpgradePick({ choices: [ 'spyglass', 'gilded-plating' ] });

        expect(service.discardWaveReward(state)).toBe(true);

        const unused = service.getUnusedCatalogUpgrades([]);

        expect(unused.some((d) => d.id === 'spyglass')).toBe(false);
        expect(unused.some((d) => d.id === 'gilded-plating')).toBe(false);
        expect(state.canStartWave).toBe(true);
        expect(state.upgradePick).toBeNull();
    });
});
