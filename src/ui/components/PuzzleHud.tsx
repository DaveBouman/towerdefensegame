import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { PuzzleState } from '../../game/events/gameEventMap';
import { EventIcon } from './EventIcon';

const GALLERY_RULES: readonly string[] = [
    'Amber tiles are the road — pack cards on them.',
    'Set chain start on the road, then Attack once.',
    'Walk the painted path (or fire every packed piece).',
    'Wrong layout → rearrange. No counterattack.',
];

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
                        {puzzle.goalLine}
                        {' '}({puzzle.cardCount} cards)
                    </p>
                </div>
            </div>
            <ul className="puzzle-hud__rules">
                {GALLERY_RULES.map((rule) => (
                    <li key={rule}>{rule}</li>
                ))}
            </ul>
            <p className="puzzle-hud__hint">{puzzle.hint}</p>
            <p className="puzzle-hud__note">One commit — walk the amber road.</p>
        </aside>
    );
};
