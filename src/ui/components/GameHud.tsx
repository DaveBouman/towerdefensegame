import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';

export const GameHud = () =>
{
    return (
        <aside className="game-hud">
            <button
                type="button"
                className="game-hud__start-wave"
                onClick={() => EventBus.emit(GAME_EVENTS.ATTACK)}
            >
                Attack
            </button>
        </aside>
    );
};
