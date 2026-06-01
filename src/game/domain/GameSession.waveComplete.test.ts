import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { GRID_CONFIG } from '../config/gridConfig';
import { Grid } from '../grid/Grid';
import { GameSession } from './GameSession';

describe('GameSession.checkWaveComplete', () =>
{
    const grid = new Grid(GRID_CONFIG);
    let session: GameSession;

    beforeEach(() =>
    {
        session = new GameSession(grid);
        session.prepare();
    });

    it('does not offer rewards between waves', () =>
    {
        session.state.setWave(1);
        session.state.setCanStartWave(true);
        session.state.setUpgradePick(null);

        session.checkWaveComplete();

        expect(session.state.upgradePick).toBeNull();
    });

    it('offers rewards once when combat ends with no enemies left', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setCanStartWave(false);
        session.state.setUpgradePick(null);

        session.checkWaveComplete();

        expect(session.state.upgradePick?.choices.length).toBeGreaterThan(0);
        expect(session.state.canStartWave).toBe(false);

        const firstChoices = [ ...(session.state.upgradePick?.choices ?? []) ];

        session.checkWaveComplete();

        expect(session.state.upgradePick?.choices).toEqual(firstChoices);
    });

    it('opens a tower draft after claiming a post-wave reward', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setUpgradePick({ choices: [ 'spyglass' ] });
        session.state.setCanStartWave(false);

        expect(session.claimWaveReward('spyglass')).toBe(true);
        expect(session.state.upgradePick).toBeNull();
        expect(session.state.towerDraftPick?.choices.length).toBeGreaterThan(0);
        expect(session.state.canStartWave).toBe(false);
        expect(session.state.deployment?.active).toBeFalsy();
    });
});
