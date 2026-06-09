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

    it('records damage from combat events', () =>
    {
        const log = new TowerRoundDamageLog();

        log.bindEventBus();
        log.beginWave(1);

        const onTowerAttacked = vi.mocked(EventBus.on).mock.calls.find(
            ([ event ]) => event === GAME_EVENTS.TOWER_ATTACKED,
        )?.[1] as (payload: { towerId: string; damage: number }) => void;
        const onEnemyAttacked = vi.mocked(EventBus.on).mock.calls.find(
            ([ event ]) => event === GAME_EVENTS.ENEMY_ATTACKED,
        )?.[1] as (payload: {
            targetKind: 'tower';
            towerId: string;
            damage: number;
        }) => void;

        onTowerAttacked({ towerId: 'tower-a', damage: 25 });
        onEnemyAttacked({
            targetKind: 'tower',
            towerId: 'tower-a',
            damage: 7,
        });

        const result = log.finalizeWave([ { id: 'tower-a', unitType: 'Militia' } ]);

        expect(result.entries[0]).toMatchObject({
            towerId: 'tower-a',
            damageDealt: 25,
            damageTaken: 7,
            expGained: 25,
        });
    });

    it('accumulates dealt and taken damage per tower for a wave', () =>
    {
        const log = new TowerRoundDamageLog();

        log.beginWave(2);
        log.recordDealt('tower-a', 40);
        log.recordDealt('tower-a', 10);
        log.recordTaken('tower-a', 5);
        log.recordTaken('tower-b', 12);

        const result = log.finalizeWave([
            { id: 'tower-a', unitType: 'Militia' },
            { id: 'tower-b', unitType: 'Archer' },
        ]);

        expect(result).toEqual({
            wave: 2,
            entries: [
                { towerId: 'tower-b', unitType: 'Archer', damageDealt: 0, damageTaken: 12, expGained: 0 },
                { towerId: 'tower-a', unitType: 'Militia', damageDealt: 50, damageTaken: 5, expGained: 50 },
            ],
        });
    });

    it('formats a readable console summary', () =>
    {
        const log: ReturnType<TowerRoundDamageLog['finalizeWave']> = {
            wave: 1,
            entries: [
                { towerId: 't1', unitType: 'Militia', damageDealt: 100, damageTaken: 20, expGained: 100 },
            ],
        };

        expect(formatWaveTowerDamageLog(log)).toBe(
            'Wave 1 tower damage:\n  Militia: dealt 100, took 20, +100 EXP',
        );
    });
});
