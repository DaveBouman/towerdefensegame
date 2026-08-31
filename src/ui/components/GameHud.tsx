import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import type { AttackReadiness, RerollState, TurnState } from '../../game/cardGame/domain/types';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import {
    readChainPathLitEnabled,
    writeChainPathLitEnabled,
} from '../../game/ui/chainPathSettings';

const REJECT_MESSAGES: Record<NonNullable<AttackReadiness['reason']>, string> = {
    'attack-in-progress': 'Attack already in progress…',
    'enemy-turn': 'Enemy is acting…',
    'enemy-defeated': 'Enemy already defeated.',
    'player-defeated': 'You were defeated.',
    'no-cards-on-board': 'Place cards on the board first.',
    'no-energy': 'Out of energy — wait for the next round.',
    'no-target': 'Lock a target first — click an enemy panel on the right.',
};

const DEFAULT_REROLL_STATE: RerollState = {
    rerollsRemaining: 0,
    maxRerollsPerFloor: 3,
    canReroll: false,
    rerollModeActive: false,
    selectedCount: 0,
};

const DEFAULT_TURN_STATE: TurnState = {
    energy: 0,
    maxEnergy: 0,
    canEndTurn: false,
};

const DEFAULT_CHAIN_START_STATE = {
    pickable: false,
    row: 0,
    rowLabel: 'A',
};

export const GameHud = ({ captureMode = false }: { captureMode?: boolean }) =>
{
    const [ readiness, setReadiness ] = useState<AttackReadiness>({
        canAttack: false,
        reason: 'no-cards-on-board',
    });
    const [ rerollState, setRerollState ] = useState<RerollState>(DEFAULT_REROLL_STATE);
    const [ turnState, setTurnState ] = useState<TurnState>(DEFAULT_TURN_STATE);
    const [ chainStart, setChainStart ] = useState(DEFAULT_CHAIN_START_STATE);
    const [ rejectMessage, setRejectMessage ] = useState<string | null>(null);
    const [ pathLit, setPathLit ] = useState(readChainPathLitEnabled);

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

        const onChainStart = (next: typeof DEFAULT_CHAIN_START_STATE): void =>
        {
            setChainStart(next);
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
        EventBus.on(GAME_EVENTS.CHAIN_START_STATE, onChainStart);
        EventBus.on(GAME_EVENTS.ATTACK_REJECTED, onRejected);
        EventBus.on(GAME_EVENTS.REROLL_STATE, onRerollState);
        EventBus.on(GAME_EVENTS.TURN_STATE, onTurnState);

        return () =>
        {
            EventBus.off(GAME_EVENTS.CARD_ATTACK_READY, onReady);
            EventBus.off(GAME_EVENTS.CHAIN_START_STATE, onChainStart);
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

    const needsTarget = readiness.reason === 'no-target';
    const showChainStartHint = chainStart.pickable
        && !rerollState.rerollModeActive
        && turnState.energy > 0;

    return (
        <aside className={`game-hud${captureMode ? ' game-hud--capture' : ''}`}>
            <div
                className="game-hud__energy"
                data-tutorial-target="energy"
                title="Energy: each Attack spends 1. After each enemy response they overclock (+attack for the rest of the fight). When empty, the board clears and energy refills."
            >
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
            {!captureMode && showChainStartHint && (
                <p className="game-hud__chain-start-hint" role="status">
                    Chain starts on row <strong>{chainStart.rowLabel}</strong>
                    {' '}— click any highlighted <strong>START</strong> column tile to move it
                </p>
            )}
            {!captureMode && (
                <p
                    className="game-hud__deploy-hint"
                    title={
                        rerollState.rerollModeActive
                            ? 'Click hand cards to select, then confirm reroll.'
                            : needsTarget
                                ? 'Multiple hostiles detected — click an enemy panel to lock your target, then Attack.'
                                : turnState.energy > 0
                                    ? 'Place cards and attack — the enemy strikes back after each attack, then overclocks. Extra attacks this round also make them hit harder.'
                                    : 'Out of energy — the enemy acts, then the board clears and energy refills.'
                    }
                >
                    {rerollState.rerollModeActive
                        ? 'Click hand cards to select, then confirm reroll.'
                        : needsTarget
                            ? 'Multiple hostiles detected — click an enemy panel to lock your target, then Attack.'
                            : turnState.energy > 0
                                ? 'Place cards and attack — the enemy strikes back after each attack, then overclocks. Extra attacks this round also make them hit harder.'
                                : 'Out of energy — the enemy acts, then the board clears and energy refills.'}
                </p>
            )}
            {!captureMode && needsTarget && (
                <p className="game-hud__target-prompt" role="status">
                    No target locked — click an enemy on the right
                </p>
            )}
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
                    Floor reroll ({rerollState.rerollsRemaining}/{rerollState.maxRerollsPerFloor})
                </button>
            )}
            {!captureMode && (
                <button
                    type="button"
                    className={
                        pathLit
                            ? 'game-hud__path-lit game-hud__path-lit--on'
                            : 'game-hud__path-lit'
                    }
                    title="Show the planned chain route on the board. Past Reroute uses a soft guess until you pick."
                    aria-pressed={pathLit}
                    onClick={() =>
                    {
                        const next = !pathLit;

                        writeChainPathLitEnabled(next);
                        setPathLit(next);
                        EventBus.emit(GAME_EVENTS.CHAIN_PATH_LIT, next);
                    }}
                >
                    Path {pathLit ? 'on' : 'off'}
                </button>
            )}
            <button
                type="button"
                data-tutorial-target="attack"
                className={
                    needsTarget
                        ? 'game-hud__attack game-hud__attack--needs-target'
                        : 'game-hud__attack'
                }
                disabled={!readiness.canAttack || rerollState.rerollModeActive}
                title={needsTarget ? 'Select an enemy target before attacking' : undefined}
                onClick={() => EventBus.emit(GAME_EVENTS.ATTACK)}
            >
                {needsTarget ? 'Select Target' : 'Attack'}
            </button>
            {rejectMessage && (
                <p
                    className={
                        rejectMessage.includes('target')
                            ? 'game-hud__reject-message game-hud__reject-message--target'
                            : 'game-hud__reject-message'
                    }
                    role="alert"
                >
                    {rejectMessage}
                </p>
            )}
        </aside>
    );
};
