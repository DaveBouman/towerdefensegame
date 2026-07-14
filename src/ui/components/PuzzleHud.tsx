import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { PuzzleState } from '../../game/events/gameEventMap';
import { PUZZLE_TRIAL_RULES } from '../../game/run/rewards';
import { EventIcon } from './EventIcon';

export const PuzzleHud = () =>
{
    const [ puzzle, setPuzzle ] = useState<PuzzleState | null>(null);

    useEffect(() =>
    {
        const onPuzzleState = (next: PuzzleState): void =>
        {
            setPuzzle(next);
        };

        EventBus.on(GAME_EVENTS.PUZZLE_STATE, onPuzzleState);

        return () =>
        {
            EventBus.off(GAME_EVENTS.PUZZLE_STATE, onPuzzleState);
            setPuzzle(null);
        };
    }, []);

    if (!puzzle)
    {
        return null;
    }

    return (
        <aside className="puzzle-hud">
            <div className="puzzle-hud__header">
                <span className="puzzle-hud__icon">
                    <EventIcon icon="puzzle" />
                </span>
                <div>
                    <h2 className="puzzle-hud__title">{puzzle.title}</h2>
                    <p className="puzzle-hud__goal">
                        Deal at least <strong>{puzzle.damageTarget}</strong> damage in one attack
                        {' '}({puzzle.cardCount} cards)
                    </p>
                </div>
            </div>
            <ul className="puzzle-hud__rules">
                {PUZZLE_TRIAL_RULES.map((rule) => (
                    <li key={rule}>{rule}</li>
                ))}
            </ul>
            <p className="puzzle-hud__hint">{puzzle.hint}</p>
            <p className="puzzle-hud__note">One attack only — no enemy counterattack.</p>
        </aside>
    );
};
