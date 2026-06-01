import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { GameStateSnapshot } from '../../game/domain/types';

const INITIAL_STATE: GameStateSnapshot = {
    gold: 100,
    wave: 0,
    lives: 20,
    canStartWave: true,
    upgradePick: null,
    deployment: null,
};

export const useGameViewModel = () =>
{
    const [ state, setState ] = useState<GameStateSnapshot>(INITIAL_STATE);

    useEffect(() =>
    {
        const onStateChanged = (snapshot: GameStateSnapshot) => setState(snapshot);

        EventBus.on(GAME_EVENTS.STATE_CHANGED, onStateChanged);

        return () => EventBus.off(GAME_EVENTS.STATE_CHANGED, onStateChanged);
    }, []);

    return state;
};
