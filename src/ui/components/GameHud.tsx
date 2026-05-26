import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import { useGameViewModel } from '../viewmodels/useGameViewModel';

export const GameHud = () =>
{
    const { gold, wave, lives, canStartWave } = useGameViewModel();
    const nextWave = wave + 1;

    const handleStartWave = () =>
    {
        EventBus.emit(GAME_EVENTS.START_WAVE);
    };

    return (
        <aside className="game-hud">
            <span>Gold {gold}</span>
            <span>Wave {wave}</span>
            <span>Lives {lives}</span>
            <button
                type="button"
                className="game-hud__start-wave"
                disabled={!canStartWave}
                onClick={handleStartWave}
            >
                {wave === 0 ? 'Start Wave' : `Start Wave ${nextWave}`}
            </button>
        </aside>
    );
};
