import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
    applyRunEventEffects,
    buildIconMatchGrid,
    getRunEvent,
    getWheelSegmentIndex,
    getWheelSpinEffects,
    ICON_MATCH_ATTEMPTS,
    ICON_MATCH_GRID_COLS,
    ICON_MATCH_PAIR_COUNT,
    resolveIconMatchResult,
    rollWheelSegment,
    WHEEL_SEGMENTS,
    type AppliedEventMessage,
    type AppliedEventResult,
    type IconMatchGrid,
    type RunEventChoice,
} from '../../game/run/runEvents';
import {
    buildWheelConicGradient,
    getWheelDisplayLayout,
    getWheelSpinRotationTarget,
} from '../../game/run/wheelDisplay';
import { seedScope } from '../../game/random/rng';
import { getRunPuzzle, rollPuzzleId } from '../../game/run/runPuzzles';
import { PUZZLE_TRIAL_RULES } from '../../game/run/rewards';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import { EventIcon } from './EventIcon';

type EventPhase = 'choices' | 'wheel' | 'matcher' | 'puzzle-brief' | 'result';

interface MatcherPlayState {
    revealed: number[];
    matched: number[];
    attemptsLeft: number;
    pairsMatched: number;
    locked: boolean;
}

const createMatcherPlayState = (): MatcherPlayState => ({
    revealed: [],
    matched: [],
    attemptsLeft: ICON_MATCH_ATTEMPTS,
    pairsMatched: 0,
    locked: false,
});

interface RunEventOverlayProps {
    eventId: string;
    nodeId: string;
    seed: string;
    playerHealth: number;
    maxHealth: number;
    gold: number;
    deck: string[];
    trinkets: string[];
    onFinish: (result: AppliedEventResult) => void;
    onStartPuzzle: (puzzleId: string) => void;
}

const toneClass = (tone: AppliedEventMessage['tone']): string =>
{
    switch (tone)
    {
        case 'good': return 'run-event__message--good';
        case 'bad': return 'run-event__message--bad';
        default: return 'run-event__message--neutral';
    }
};

export const RunEventOverlay = ({
    eventId,
    nodeId,
    seed,
    playerHealth,
    maxHealth,
    gold,
    deck,
    trinkets,
    onFinish,
    onStartPuzzle,
}: RunEventOverlayProps) =>
{
    const event = getRunEvent(eventId);
    const [ phase, setPhase ] = useState<EventPhase>('choices');
    const [ puzzleId, setPuzzleId ] = useState<string | null>(null);
    const [ messages, setMessages ] = useState<AppliedEventMessage[]>([]);
    const [ snapshot, setSnapshot ] = useState({
        playerHealth,
        gold,
        deck,
        trinkets,
    });

    const [ wheelSpinning, setWheelSpinning ] = useState(false);
    const [ wheelRotation, setWheelRotation ] = useState(0);
    const [ matcherPlay, setMatcherPlay ] = useState<MatcherPlayState | null>(null);
    const matcherFinishRef = useRef<number | null>(null);

    const matchGrid = useMemo<IconMatchGrid | null>(() =>
    {
        if (phase !== 'matcher')
        {
            return null;
        }

        seedScope(seed, `event:${nodeId}:match`);

        return buildIconMatchGrid();
    }, [ phase, seed, nodeId ]);

    const wheelLayout = useMemo(() => getWheelDisplayLayout(), []);
    const wheelGradient = useMemo(() => buildWheelConicGradient(), []);

    useEffect(() =>
    {
        if (phase === 'matcher' && matchGrid)
        {
            setMatcherPlay(createMatcherPlayState());
        }
        else
        {
            setMatcherPlay(null);
        }

        return () =>
        {
            if (matcherFinishRef.current !== null)
            {
                window.clearTimeout(matcherFinishRef.current);
                matcherFinishRef.current = null;
            }
        };
    }, [ phase, matchGrid ]);

    const runState = () => ({
        playerHealth: snapshot.playerHealth,
        maxHealth,
        gold: snapshot.gold,
        deck: snapshot.deck,
        trinkets: snapshot.trinkets,
    });

    const showResult = (result: AppliedEventResult): void =>
    {
        setSnapshot({
            playerHealth: result.playerHealth,
            gold: result.gold,
            deck: result.deck,
            trinkets: result.trinkets,
        });
        setMessages(result.messages);
        setPhase('result');
    };

    const handleChoice = (choice: RunEventChoice): void =>
    {
        const openWheel = choice.effects.some((effect) => effect.kind === 'open-wheel');
        const openMatch = choice.effects.some((effect) => effect.kind === 'open-icon-match');
        const openPuzzle = choice.effects.find((effect) => effect.kind === 'open-puzzle');

        if (openWheel)
        {
            setPhase('wheel');
            return;
        }

        if (openMatch)
        {
            setPhase('matcher');
            return;
        }

        if (openPuzzle)
        {
            seedScope(seed, `event:${nodeId}:puzzle`);
            const rolledId = openPuzzle.puzzleId === '__random__'
                ? rollPuzzleId()
                : openPuzzle.puzzleId;

            setPuzzleId(rolledId);
            setPhase('puzzle-brief');
            return;
        }

        showResult(applyRunEventEffects(choice.effects, runState()));
    };

    const spinWheel = (): void =>
    {
        if (wheelSpinning)
        {
            return;
        }

        seedScope(seed, `event:${nodeId}:wheel`);
        const segment = rollWheelSegment();
        const index = getWheelSegmentIndex(segment.id);
        const target = getWheelSpinRotationTarget(index);

        setWheelSpinning(true);
        setWheelRotation(target);

        window.setTimeout(() =>
        {
            setWheelSpinning(false);
            showResult(applyRunEventEffects(getWheelSpinEffects(segment), runState()));
        }, 2600);
    };

    const finishMatcher = (pairsMatched: number): void =>
    {
        showResult(resolveIconMatchResult(pairsMatched, runState()));
    };

    const pickMatcherTile = (index: number): void =>
    {
        if (!matchGrid || !matcherPlay || matcherPlay.locked)
        {
            return;
        }

        if (matcherPlay.matched.includes(index) || matcherPlay.revealed.includes(index))
        {
            return;
        }

        const nextRevealed = [ ...matcherPlay.revealed, index ];

        if (nextRevealed.length < 2)
        {
            setMatcherPlay({ ...matcherPlay, revealed: nextRevealed });
            return;
        }

        const [ firstIndex, secondIndex ] = nextRevealed;
        const isMatch = matchGrid.tiles[firstIndex] === matchGrid.tiles[secondIndex];
        const attemptsLeft = matcherPlay.attemptsLeft - 1;
        const pairsMatched = matcherPlay.pairsMatched + (isMatch ? 1 : 0);
        const matched = isMatch
            ? [ ...matcherPlay.matched, firstIndex, secondIndex ]
            : matcherPlay.matched;
        const finished = attemptsLeft <= 0 || pairsMatched >= ICON_MATCH_PAIR_COUNT;

        if (isMatch)
        {
            setMatcherPlay({
                revealed: [],
                matched,
                attemptsLeft,
                pairsMatched,
                locked: false,
            });

            if (finished)
            {
                finishMatcher(pairsMatched);
            }

            return;
        }

        setMatcherPlay({
            ...matcherPlay,
            revealed: nextRevealed,
            attemptsLeft,
            pairsMatched,
            locked: true,
        });

        matcherFinishRef.current = window.setTimeout(() =>
        {
            matcherFinishRef.current = null;
            setMatcherPlay({
                revealed: [],
                matched,
                attemptsLeft,
                pairsMatched,
                locked: false,
            });

            if (finished)
            {
                finishMatcher(pairsMatched);
            }
        }, 750);
    };

    const finish = (): void =>
    {
        onFinish({
            playerHealth: snapshot.playerHealth,
            gold: snapshot.gold,
            deck: snapshot.deck,
            trinkets: snapshot.trinkets,
            messages,
        });
    };

    const puzzle = puzzleId ? getRunPuzzle(puzzleId) : null;

    const beginPuzzle = (): void =>
    {
        if (!puzzleId)
        {
            return;
        }

        onStartPuzzle(puzzleId);
    };

    return (
        <div className="run-event">
            <div className="run-event__panel">
                <header className="run-event__header">
                    <span className="run-event__icon">
                        <EventIcon icon={event.icon} />
                    </span>
                    <h1 className="run-event__title">{event.title}</h1>
                    <p className="run-event__intro">{event.intro}</p>
                </header>

                {phase === 'choices' && (
                    <div className="run-event__choices">
                        {event.choices.map((choice) => (
                            <button
                                key={choice.id}
                                type="button"
                                className="run-event__choice"
                                onClick={() => handleChoice(choice)}
                            >
                                <span className="run-event__choice-icon">
                                    <EventIcon icon={choice.icon} />
                                </span>
                                <span className="run-event__choice-label">{choice.label}</span>
                                <span className="run-event__choice-desc">{choice.description}</span>
                            </button>
                        ))}
                    </div>
                )}

                {phase === 'wheel' && (
                    <div className="run-event__wheel-wrap">
                        <div
                            className={`run-event__wheel${wheelSpinning ? ' run-event__wheel--spinning' : ''}`}
                            style={{ transform: `rotate(${wheelRotation}deg)` }}
                            aria-label="Prize wheel"
                        >
                            <div
                                className="run-event__wheel-disc"
                                style={{ background: wheelGradient }}
                            />
                            {wheelLayout.map((segment) => (
                                <div
                                    key={segment.id}
                                    className={`run-event__wheel-segment run-event__wheel-segment--${segment.tone}`}
                                    style={{ '--wheel-angle': `${segment.midAngle}deg` } as CSSProperties}
                                >
                                    <span className="run-event__wheel-segment-icon" title={segment.label}>
                                        <EventIcon icon={segment.icon} />
                                    </span>
                                </div>
                            ))}
                            <div className="run-event__wheel-hub" aria-hidden="true" />
                        </div>
                        <div className="run-event__wheel-pointer" aria-hidden="true" />
                        <p className="run-event__wheel-note">
                            Curses and traps crowd the rim — the wheel only <em>looks</em> rigged against you.
                        </p>
                        <div className="run-event__wheel-legend">
                            {WHEEL_SEGMENTS.map((segment) => (
                                <span key={segment.id} className="run-event__wheel-legend-item">
                                    <EventIcon icon={segment.icon} />
                                    {segment.label}
                                </span>
                            ))}
                        </div>
                        {!wheelSpinning && phase === 'wheel' && messages.length === 0 && (
                            <button type="button" className="run-event__spin-btn" onClick={spinWheel}>
                                Spin!
                            </button>
                        )}
                    </div>
                )}

                {phase === 'matcher' && matchGrid && matcherPlay && (
                    <div className="run-event__matcher">
                        <div className="run-event__matcher-status">
                            <span>Attempts left: <strong>{matcherPlay.attemptsLeft}</strong></span>
                            <span>Pairs matched: <strong>{matcherPlay.pairsMatched}</strong> / {ICON_MATCH_PAIR_COUNT}</span>
                        </div>
                        <p className="run-event__matcher-hint">
                            Flip two sigils per attempt. Match as many pairs as you can.
                        </p>
                        <div
                            className="run-event__matcher-grid"
                            style={{ gridTemplateColumns: `repeat(${ICON_MATCH_GRID_COLS}, 1fr)` }}
                        >
                            {matchGrid.tiles.map((icon, index) =>
                            {
                                const isMatched = matcherPlay.matched.includes(index);
                                const isRevealed = isMatched || matcherPlay.revealed.includes(index);
                                const tileClass = [
                                    'run-event__matcher-tile',
                                    isRevealed ? 'run-event__matcher-tile--revealed' : '',
                                    isMatched ? 'run-event__matcher-tile--matched' : '',
                                ].filter(Boolean).join(' ');

                                return (
                                    <button
                                        key={`tile-${index}`}
                                        type="button"
                                        className={tileClass}
                                        onClick={() => pickMatcherTile(index)}
                                        disabled={matcherPlay.locked || isMatched}
                                        aria-label={isRevealed ? `Sigil ${icon}` : 'Hidden sigil'}
                                    >
                                        {isRevealed
                                            ? <EventIcon icon={icon} />
                                            : <span className="run-event__matcher-back">?</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {phase === 'puzzle-brief' && puzzle && (
                    <div className="run-event__puzzle-brief">
                        <h2 className="run-event__puzzle-title">{puzzle.title}</h2>
                        <p className="run-event__puzzle-intro">{puzzle.intro}</p>
                        <p className="run-event__puzzle-goal">
                            Goal: deal at least <strong>{puzzle.damageTarget}</strong> damage
                            with <strong>{puzzle.cards.length}</strong> cards in one attack.
                        </p>
                        <ul className="run-event__puzzle-rules">
                            {PUZZLE_TRIAL_RULES.map((rule) => (
                                <li key={rule}>{rule}</li>
                            ))}
                        </ul>
                        <p className="run-event__puzzle-hint">{puzzle.hint}</p>
                        <ul className="run-event__puzzle-cards">
                            {puzzle.cards.map((card, index) => (
                                <li key={`${card.definitionId}-${index}`}>
                                    {getCardDefinitionOrThrow(card.definitionId).label}
                                </li>
                            ))}
                        </ul>
                        <button type="button" className="run-event__continue" onClick={beginPuzzle}>
                            Begin Trial
                        </button>
                    </div>
                )}

                {phase === 'result' && (
                    <div className="run-event__result">
                        <ul className="run-event__messages">
                            {messages.length === 0 ? (
                                <li className="run-event__message run-event__message--neutral">Nothing changed.</li>
                            ) : (
                                messages.map((message, index) => (
                                    <li
                                        key={`${message.text}-${index}`}
                                        className={`run-event__message ${toneClass(message.tone)}`}
                                    >
                                        {message.text}
                                    </li>
                                ))
                            )}
                        </ul>
                        <div className="run-event__stats">
                            <span>HP {snapshot.playerHealth}/{maxHealth}</span>
                            <span>{snapshot.gold} gold</span>
                            {snapshot.trinkets.length > 0 && (
                                <span>{snapshot.trinkets.length} trinket(s)</span>
                            )}
                        </div>
                        <button type="button" className="run-event__continue" onClick={finish}>
                            Continue
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
