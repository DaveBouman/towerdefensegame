import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { formatWaveTowerDamageLog, TowerRoundDamageLog } from './TowerRoundDamageLog';

describe('TowerRoundDamageLog', () =>
{
    beforeEach(() =>
    {
        vi.mocked(EventBus.on).mockClear();
    });

    it('records kill EXP from combat events', () =>
    {
        const log = new TowerRoundDamageLog();

        log.bindEventBus();
        log.beginWave(2);

        const onKillExp = vi.mocked(EventBus.on).mock.calls.find(
            ([ event ]) => event === GAME_EVENTS.TOWER_KILL_EXP,
        )?.[1] as (payload: { towerId: string; exp: number }) => void;

        onKillExp({ towerId: 'tower-a', exp: 28 });
        onKillExp({ towerId: 'tower-a', exp: 15 });

        const result = log.finalizeWave([ { id: 'tower-a', unitType: 'Militia' } ]);

        expect(result.entries[0]).toMatchObject({
            towerId: 'tower-a',
            killExp: 43,
            waveBonusExp: 44,
            expGained: 87,
        });
    });

    it('includes wave bonus for every tower', () =>
    {
        const log = new TowerRoundDamageLog();

        log.beginWave(3);

        const result = log.finalizeWave([
            { id: 'tower-a', unitType: 'Militia' },
            { id: 'tower-b', unitType: 'Scout' },
        ]);

        expect(result.entries).toHaveLength(2);
        expect(result.entries.every((entry) => entry.waveBonusExp === 65)).toBe(true);
        expect(result.entries.every((entry) => entry.killExp === 0)).toBe(true);
    });

    it('formats a readable console summary', () =>
    {
        const log: ReturnType<TowerRoundDamageLog['finalizeWave']> = {
            wave: 1,
            entries: [
                {
                    towerId: 't1',
                    unitType: 'Militia',
                    damageDealt: 100,
                    damageTaken: 20,
                    killExp: 66,
                    waveBonusExp: 30,
                    expGained: 96,
                },
            ],
        };

        expect(formatWaveTowerDamageLog(log)).toBe(
            'Wave 1 tower EXP:\n  Militia: +66 kill EXP, +30 wave bonus (96 total)',
        );
    });
});
