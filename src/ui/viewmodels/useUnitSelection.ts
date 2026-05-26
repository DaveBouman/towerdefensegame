import { useCallback, useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { UnitSelection } from '../../game/domain/types';

export const useUnitSelection = () =>
{
    const [ selection, setSelection ] = useState<UnitSelection | null>(null);

    useEffect(() =>
    {
        const onSelectionChanged = (next: UnitSelection | null) => setSelection(next);

        EventBus.on(GAME_EVENTS.SELECTION_CHANGED, onSelectionChanged);

        return () => EventBus.off(GAME_EVENTS.SELECTION_CHANGED, onSelectionChanged);
    }, []);

    const clear = useCallback(() =>
    {
        EventBus.emit(GAME_EVENTS.SELECTION_CLEARED);
    }, []);

    return { selection, clear };
};
