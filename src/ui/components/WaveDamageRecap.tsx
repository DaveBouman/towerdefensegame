import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { WaveTowerDamageLog } from '../../game/domain/types';

export const WaveDamageRecap = () =>
{
    const [ log, setLog ] = useState<WaveTowerDamageLog | null>(null);

    useEffect(() =>
    {
        const onWaveLog = (waveLog: WaveTowerDamageLog): void =>
        {
            setLog(waveLog);
        };

        EventBus.on(GAME_EVENTS.WAVE_TOWER_DAMAGE_LOG, onWaveLog);

        return () => EventBus.off(GAME_EVENTS.WAVE_TOWER_DAMAGE_LOG, onWaveLog);
    }, []);

    if (!log)
    {
        return null;
    }

    return (
        <div
            className="wave-damage-recap"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wave-damage-recap-title"
        >
            <div className="wave-damage-recap__panel">
                <h2 id="wave-damage-recap-title" className="wave-damage-recap__title">
                    Wave {log.wave} combat log
                </h2>
                <p className="wave-damage-recap__hint">
                    Kills earn EXP during the wave; every unit also gets an exponential wave bonus so recruits catch up.
                </p>
                <table className="wave-damage-recap__table">
                    <thead>
                        <tr>
                            <th scope="col">Unit</th>
                            <th scope="col">Kill EXP</th>
                            <th scope="col">Wave bonus</th>
                            <th scope="col">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {log.entries.map((entry) => (
                            <tr key={entry.towerId}>
                                <td>{entry.unitType}</td>
                                <td>{entry.killExp}</td>
                                <td>{entry.waveBonusExp}</td>
                                <td>{entry.expGained}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button
                    type="button"
                    className="wave-damage-recap__close"
                    onClick={() => setLog(null)}
                >
                    Close
                </button>
            </div>
        </div>
    );
};
