import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import type { AttackReadiness } from '../../game/cardGame/domain/types';
import { GAME_EVENTS } from '../../game/events/gameEvents';

const REJECT_MESSAGES: Record<NonNullable<AttackReadiness['reason']>, string> = {
    'attack-in-progress': 'Attack already in progress…',
    'enemy-turn': 'Enemy is acting…',
    'enemy-defeated': 'Enemy already defeated.',
    'player-defeated': 'You were defeated.',
    'no-cards-on-board': 'Place cards on the board first.',
};

export const GameHud = () =>
{
    const [ readiness, setReadiness ] = useState<AttackReadiness>({
        canAttack: false,
        reason: 'no-cards-on-board',
    });
    const [ rejectMessage, setRejectMessage ] = useState<string | null>(null);

    useEffect(() =>
    {
        const onReady = (next: AttackReadiness): void =>
        {
            setReadiness(next);
        };

        const onRejected = ({ reason }: { reason: AttackReadiness['reason'] }): void =>
        {
            if (!reason)
            {
                return;
            }

            setRejectMessage(REJECT_MESSAGES[reason]);
        };

        EventBus.on(GAME_EVENTS.CARD_ATTACK_READY, onReady);
        EventBus.on(GAME_EVENTS.ATTACK_REJECTED, onRejected);

        return () =>
        {
            EventBus.off(GAME_EVENTS.CARD_ATTACK_READY, onReady);
            EventBus.off(GAME_EVENTS.ATTACK_REJECTED, onRejected);
        };
    }, []);

    useEffect(() =>
    {
        if (!rejectMessage)
        {
            return;
        }

        const timer = window.setTimeout(() => setRejectMessage(null), 2400);

        return () => window.clearTimeout(timer);
    }, [ rejectMessage ]);

    return (
        <aside className="game-hud">
            <p className="game-hud__deploy-hint">
                Drag cards onto the grid. Arrows show which card activates next.
            </p>
            <button
                type="button"
                className="game-hud__start-wave"
                disabled={!readiness.canAttack}
                onClick={() => EventBus.emit(GAME_EVENTS.ATTACK)}
            >
                Attack
            </button>
            {rejectMessage && (
                <p className="game-hud__deploy-hint" role="status">
                    {rejectMessage}
                </p>
            )}
        </aside>
    );
};
