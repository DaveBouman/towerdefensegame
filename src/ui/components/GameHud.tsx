import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import type { AttackReadiness, RerollState, TurnState } from '../../game/cardGame/domain/types';
import { GAME_EVENTS } from '../../game/events/gameEvents';

const REJECT_MESSAGES: Record<NonNullable<AttackReadiness['reason']>, string> = {
    'attack-in-progress': 'Attack already in progress…',
    'enemy-turn': 'Enemy is acting…',
    'enemy-defeated': 'Enemy already defeated.',
    'player-defeated': 'You were defeated.',
    'no-cards-on-board': 'Place cards on the board first.',
    'no-energy': 'Out of energy — end your turn.',
};

const DEFAULT_REROLL_STATE: RerollState = {
    rerollsRemaining: 0,
    maxRerollsPerFight: 3,
    canReroll: false,
    rerollModeActive: false,
    selectedCount: 0,
};

const DEFAULT_TURN_STATE: TurnState = {
    energy: 0,
    maxEnergy: 0,
    canEndTurn: false,
};

export const GameHud = () =>
{
    const [ readiness, setReadiness ] = useState<AttackReadiness>({
        canAttack: false,
        reason: 'no-cards-on-board',
    });
    const [ rerollState, setRerollState ] = useState<RerollState>(DEFAULT_REROLL_STATE);
    const [ turnState, setTurnState ] = useState<TurnState>(DEFAULT_TURN_STATE);
    const [ rejectMessage, setRejectMessage ] = useState<string | null>(null);

    useEffect(() =>
    {
        const onReady = (next: AttackReadiness): void =>
        {
            setReadiness(next);
        };

        const onTurnState = (next: TurnState): void =>
        {
            setTurnState(next);
        };

        const onRejected = ({ reason }: { reason: AttackReadiness['reason'] }): void =>
        {
            if (!reason)
            {
                return;
            }

            setRejectMessage(REJECT_MESSAGES[reason]);
        };

        const onRerollState = (next: RerollState): void =>
        {
            setRerollState(next);
        };

        EventBus.on(GAME_EVENTS.CARD_ATTACK_READY, onReady);
        EventBus.on(GAME_EVENTS.ATTACK_REJECTED, onRejected);
        EventBus.on(GAME_EVENTS.REROLL_STATE, onRerollState);
        EventBus.on(GAME_EVENTS.TURN_STATE, onTurnState);

        return () =>
        {
            EventBus.off(GAME_EVENTS.CARD_ATTACK_READY, onReady);
            EventBus.off(GAME_EVENTS.ATTACK_REJECTED, onRejected);
            EventBus.off(GAME_EVENTS.REROLL_STATE, onRerollState);
            EventBus.off(GAME_EVENTS.TURN_STATE, onTurnState);
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
            <div className="game-hud__energy" title="Attacks left this turn">
                <span className="game-hud__energy-label">Energy</span>
                <span className="game-hud__energy-pips">
                    {Array.from({ length: turnState.maxEnergy }, (_, i) => (
                        <span
                            key={i}
                            className={
                                i < turnState.energy
                                    ? 'game-hud__energy-pip game-hud__energy-pip--full'
                                    : 'game-hud__energy-pip'
                            }
                        />
                    ))}
                </span>
                <span className="game-hud__energy-count">
                    {turnState.energy}/{turnState.maxEnergy}
                </span>
            </div>
            <p className="game-hud__deploy-hint">
                {rerollState.rerollModeActive
                    ? 'Click hand cards to select, then confirm reroll.'
                    : 'Attack chains through the whole board and keeps it — add cards and attack again to escalate.'}
            </p>
            {rerollState.rerollModeActive ? (
                <div className="game-hud__reroll-actions">
                    <button
                        type="button"
                        className="game-hud__reroll-confirm"
                        disabled={rerollState.selectedCount === 0}
                        onClick={() => EventBus.emit(GAME_EVENTS.REROLL_CONFIRM)}
                    >
                        Reroll {rerollState.selectedCount > 0 ? `(${rerollState.selectedCount})` : ''}
                    </button>
                    <button
                        type="button"
                        className="game-hud__reroll-cancel"
                        onClick={() => EventBus.emit(GAME_EVENTS.REROLL_CANCEL)}
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    className="game-hud__reroll"
                    disabled={!rerollState.canReroll}
                    onClick={() => EventBus.emit(GAME_EVENTS.REROLL_BEGIN)}
                >
                    Reroll ({rerollState.rerollsRemaining} left)
                </button>
            )}
            <button
                type="button"
                className="game-hud__start-wave"
                disabled={!readiness.canAttack || rerollState.rerollModeActive}
                onClick={() => EventBus.emit(GAME_EVENTS.ATTACK)}
            >
                Attack
            </button>
            <button
                type="button"
                className="game-hud__end-turn"
                disabled={!turnState.canEndTurn || rerollState.rerollModeActive}
                onClick={() => EventBus.emit(GAME_EVENTS.END_TURN)}
            >
                End Turn
            </button>
            {rejectMessage && (
                <p className="game-hud__deploy-hint" role="status">
                    {rejectMessage}
                </p>
            )}
        </aside>
    );
};
