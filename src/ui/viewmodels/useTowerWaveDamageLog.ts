import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { TowerRoundDamageEntry, WaveTowerDamageLog } from '../../game/domain/types';

export const useTowerWaveDamageLog = () =>
{
    const [ lastWaveLog, setLastWaveLog ] = useState<WaveTowerDamageLog | null>(null);

    useEffect(() =>
    {
        const onWaveLog = (log: WaveTowerDamageLog): void =>
        {
            setLastWaveLog(log);
        };

        EventBus.on(GAME_EVENTS.WAVE_TOWER_DAMAGE_LOG, onWaveLog);

        return () => EventBus.off(GAME_EVENTS.WAVE_TOWER_DAMAGE_LOG, onWaveLog);
    }, []);

    const getTowerEntry = (
        towerId: string,
    ): (TowerRoundDamageEntry & { wave: number }) | null =>
    {
        if (!lastWaveLog)
        {
            return null;
        }

        const entry = lastWaveLog.entries.find((item) => item.towerId === towerId);

        if (!entry)
        {
            return null;
        }

        return { ...entry, wave: lastWaveLog.wave };
    };

    return { lastWaveLog, getTowerEntry };
};
