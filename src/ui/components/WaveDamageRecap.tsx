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
                    Damage dealt earns EXP for that unit. Gold is spent recruiting new units between waves.
                </p>
                <table className="wave-damage-recap__table">
                    <thead>
                        <tr>
                            <th scope="col">Unit</th>
                            <th scope="col">Dealt</th>
                            <th scope="col">Taken</th>
                            <th scope="col">+EXP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {log.entries.map((entry) => (
                            <tr key={entry.towerId}>
                                <td>{entry.unitType}</td>
                                <td>{entry.damageDealt}</td>
                                <td>{entry.damageTaken}</td>
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
