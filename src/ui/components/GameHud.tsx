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
    'no-cards-on-board': 'Set chain start on a packed card (click a column-1 tile), or Path preview off/on to refresh.',
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
    const boardMoves = turnState.boardMovesRemaining;
    const betweenAttackMoves = typeof boardMoves === 'number';
    const stormLive = (turnState.stormLabels?.length ?? 0) > 0;
    const primaryStorm = turnState.stormLabels?.[0];
    const showChainStartHint = chainStart.pickable
        && !rerollState.rerollModeActive
        && turnState.energy > 0
        && !betweenAttackMoves;
    const showComboChip = typeof turnState.forecastDamage === 'number'
        && turnState.forecastDamage > 0
        && !captureMode;

    const deployHint = (() =>
    {
        if (rerollState.rerollModeActive)
        {
            return {
                title: 'Click hand cards to select, then confirm reroll.',
                text: 'Select cards, then confirm reroll.',
            };
        }

        if (needsTarget)
        {
            return {
                title: 'Click an enemy panel to lock your target, then Attack.',
                text: 'Lock a target, then Attack.',
            };
        }

        if (betweenAttackMoves)
        {
            if (boardMoves > 0 && stormLive && primaryStorm)
            {
                return {
                    title: `${primaryStorm} is live — move carefully. Next Attack auto-fires (or press Attack early).`,
                    text: `${primaryStorm} live — ${boardMoves} move${boardMoves === 1 ? '' : 's'} to protect it.`,
                };
            }

            if (boardMoves > 0)
            {
                return {
                    title: 'Place, move, swap, or pick up cards — each counts as one move. Build a combo storm before the next Attack auto-fires.',
                    text: `${boardMoves} board move${boardMoves === 1 ? '' : 's'} — next Attack auto.`,
                };
            }

            return {
                title: 'Board moves used up — next Attack fires automatically (or press Attack now).',
                text: 'No moves left — Attack auto.',
            };
        }

        if (turnState.energy > 0)
        {
            return {
                title: 'Place cards and Attack. Wire combos (Fire, Rad, Bleed, Fortify, Overload) for crescendo across the burst.',
                text: stormLive && primaryStorm
                    ? `${primaryStorm} ready — Attack.`
                    : 'Place cards, then Attack.',
            };
        }

        return {
            title: 'Out of energy — board clears after the enemy acts.',
            text: 'Out of energy.',
        };
    })();

    const momentumLabel = typeof turnState.comboMomentumMult === 'number'
        && turnState.comboMomentumMult > 1.001
        ? `COMBO ×${turnState.comboMomentumMult.toFixed(2).replace(/\.?0+$/, '')}`
        : null;
    const loopLabel = typeof turnState.loopIndex === 'number'
        && typeof turnState.burstLimit === 'number'
        && turnState.burstLimit > 0
        ? `Loop ${Math.min(turnState.loopIndex + 1, turnState.burstLimit)}/${turnState.burstLimit}`
        : null;

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
            {showComboChip && (
                <div
                    className="game-hud__combo-chip"
                    title={
                        turnState.stormLabels?.length
                            ? `Storms: ${turnState.stormLabels.join(', ')}`
                            : 'Projected chain damage before enemy mitigation'
                    }
                >
                    <span className="game-hud__combo-forecast">
                        ~{turnState.forecastDamage}
                        {(turnState.forecastBonus ?? 0) > 0
                            ? ` (+${turnState.forecastBonus})`
                            : ''}
                    </span>
                    {momentumLabel && (
                        <span className="game-hud__combo-momentum">{momentumLabel}</span>
                    )}
                    {loopLabel && (
                        <span className="game-hud__combo-loop">{loopLabel}</span>
                    )}
                </div>
            )}
            {!captureMode && showChainStartHint && (
                <p className="game-hud__chain-start-hint" role="status">
                    Chain start: row <strong>{chainStart.rowLabel}</strong>
                </p>
            )}
            {!captureMode && (
                <p
                    className="game-hud__deploy-hint"
                    title={deployHint.title}
                >
                    {deployHint.text}
                </p>
            )}
            {!captureMode && needsTarget && (
                <p className="game-hud__target-prompt" role="status">
                    Select target
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
                    Reroll ({rerollState.rerollsRemaining}/{rerollState.maxRerollsPerFloor})
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
                    title="Preview your chain route on the board. Toggle anytime — does not block Attack or Engage."
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
