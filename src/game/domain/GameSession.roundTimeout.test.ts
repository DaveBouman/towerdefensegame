import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { ROUND_MAX_DURATION_TICKS } from '../config/gameClockConfig';
import { GRID_CONFIG } from '../config/gridConfig';
import { Grid } from '../grid/Grid';
import { GameSession } from './GameSession';

describe('GameSession round timeout', () =>
{
    const grid = new Grid(GRID_CONFIG);
    let session: GameSession;

    const beginWaveOne = (): void =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setCanStartWave(true);
        session.startWave();
    };

    beforeEach(() =>
    {
        session = new GameSession(grid);
        session.prepare();
    });

    it('auto-advances without bonuses after 90 seconds of combat', () =>
    {
        beginWaveOne();
        expect(session.state.wave).toBe(1);

        const expBefore = session.towers.all[0]?.experience ?? 0;

        for (let tick = 0; tick < ROUND_MAX_DURATION_TICKS; tick++)
        {
            session.advanceTick();
        }

        expect(session.state.wave).toBe(2);
        expect(session.isRoundActive()).toBe(true);
        expect(session.state.upgradePick).toBeNull();
        expect(session.state.towerDraftPick).toBeNull();
        expect(session.towers.all[0]?.experience ?? 0).toBe(expBefore);
    });

    it('does not end the round before the time limit', () =>
    {
        beginWaveOne();

        for (let tick = 0; tick < ROUND_MAX_DURATION_TICKS - 1; tick++)
        {
            session.advanceTick();
        }

        expect(session.state.wave).toBe(1);
        expect(session.isRoundActive()).toBe(true);
    });
});
