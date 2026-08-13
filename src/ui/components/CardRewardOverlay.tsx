import { useEffect, useMemo, useState } from 'react';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import { cardNeedsDirectionPick } from '../../game/run/runDeck';
import { CardDirectionPicker } from './CardDirectionPicker';
import { describeCardReward } from '../../game/run/rewards';
import type { RunDeckCard } from '../../game/run/runDeck';
import { groupRunDeckEntries } from '../../game/run/runDeck';
import { CardChip } from './CardChip';
import { ModalShell } from './CyberPanel';
import { RunDeckViewPopup } from './RunDeckViewPopup';
import { DirectionArrowIcon } from './DirectionArrowIcon';
import { createCardInstance } from '../../game/cardGame/domain/createCardInstance';
import { arrowPoolLabel, getForwardDirectionsForPool } from '../../game/cardGame/domain/cardDirections';
import { resolveCardTooltip } from '../../game/cardGame/presentation/tooltips/cardTooltipRegistry';

interface CardRewardOverlayProps {
    /** Card definition ids offered as choices. */
    options: string[];
    /** Current run deck — shown so picks can fit the build. */
    deck: readonly RunDeckCard[];
    /** How many cards the player may keep. */
    pickCount: number;
    /** Whether the player may reroll the offered choices. */
    rerollable: boolean;
    /** When true the player can confirm with zero selections. */
    allowEmptyPick?: boolean;
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    rules?: readonly string[];
    synergyHints?: Record<string, string>;
    onConfirm: (cards: RunDeckCard[]) => void;
    onSkip?: () => void;
    onReroll?: () => void;
}

type RewardStep = 'choose' | 'direction';

const needsDirectionPick = cardNeedsDirectionPick;

export const CardRewardOverlay = ({
    options,
    deck,
    pickCount,
    rerollable,
    allowEmptyPick = true,
    eyebrow = 'Victory spoils',
    title,
    subtitle,
    rules,
    synergyHints,
    onConfirm,
    onSkip,
    onReroll,
}: CardRewardOverlayProps) =>
{
    const [ selected, setSelected ] = useState<string[]>([]);
    const [ revealedCount, setRevealedCount ] = useState(0);
    const [ step, setStep ] = useState<RewardStep>('choose');
    const [ directionQueue, setDirectionQueue ] = useState<string[]>([]);
    const [ directionIndex, setDirectionIndex ] = useState(0);
    const [ resolvedCards, setResolvedCards ] = useState<RunDeckCard[]>([]);
    const [ deckPopupOpen, setDeckPopupOpen ] = useState(false);
    const [ inspectedId, setInspectedId ] = useState<string | null>(null);
    const cards = useMemo(() => options.map(describeCardReward), [ options ]);
    const deckEntries = useMemo(() => groupRunDeckEntries(deck), [ deck ]);
    const tooltips = useMemo(() =>
    {
        const map = new Map<string, ReturnType<typeof resolveCardTooltip>>();

        for (const card of cards)
        {
            map.set(card.definitionId, resolveCardTooltip(createCardInstance(card.definitionId)));
        }

        return map;
    }, [ cards ]);

    useEffect(() =>
    {
        setSelected([]);
        setRevealedCount(0);
        setStep('choose');
        setDirectionQueue([]);
        setDirectionIndex(0);
        setResolvedCards([]);
        setDeckPopupOpen(false);
        setInspectedId(null);

        if (cards.length === 0)
        {
            return;
        }

        const timers = cards.map((_card, index) =>
            window.setTimeout(() => setRevealedCount((prev) => Math.max(prev, index + 1)), 120 + index * 140),
        );

        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [ cards ]);

    const resolvedTitle = title ?? (pickCount > 1
        ? `Add up to ${pickCount} cards to your deck`
        : 'Pick a card reward');

    const toggle = (definitionId: string): void =>
    {
        setInspectedId(definitionId);
        setSelected((prev) =>
        {
            if (prev.includes(definitionId))
            {
                return prev.filter((id) => id !== definitionId);
            }

            if (prev.length >= pickCount)
            {
                return pickCount === 1
                    ? [ definitionId ]
                    : [ ...prev.slice(1), definitionId ];
            }

            return [ ...prev, definitionId ];
        });
    };

    const canConfirmChoose = allowEmptyPick
        ? selected.length <= pickCount
        : selected.length === Math.min(pickCount, cards.length);

    const confirmLabel = selected.length > 0
        ? `Take ${selected.length === 1 ? cards.find((card) => card.definitionId === selected[0])?.label ?? 'card' : `(${selected.length})`}`
        : 'Take nothing';

    const finishWithCards = (picked: RunDeckCard[]): void =>
    {
        onConfirm(picked);
    };

    const beginDirectionStep = (): void =>
    {
        const jokers = selected.filter((id) => !needsDirectionPick(id));
        const queued = selected.filter((id) => needsDirectionPick(id));

        setResolvedCards(jokers.map((definitionId) => ({ definitionId })));

        if (queued.length === 0)
        {
            finishWithCards(jokers.map((definitionId) => ({ definitionId })));
            return;
        }

        setDirectionQueue(queued);
        setDirectionIndex(0);
        setStep('direction');
    };

    const handleChooseConfirm = (): void =>
    {
        if (selected.length === 0)
        {
            finishWithCards([]);
            return;
        }

        beginDirectionStep();
    };

    const currentDirectionId = directionQueue[directionIndex];
    const currentDefinition = currentDirectionId
        ? getCardDefinitionOrThrow(currentDirectionId)
        : null;

    const pickDirection = (arrow: import('../../game/cardGame/domain/cardDirections').CardDirection): void =>
    {
        if (!currentDirectionId)
        {
            return;
        }

        const nextResolved = [ ...resolvedCards, { definitionId: currentDirectionId, arrow } ];
        const nextIndex = directionIndex + 1;

        if (nextIndex >= directionQueue.length)
        {
            finishWithCards(nextResolved);
            return;
        }

        setResolvedCards(nextResolved);
        setDirectionIndex(nextIndex);
    };

    const backToChoose = (): void =>
    {
        setStep('choose');
        setDirectionQueue([]);
        setDirectionIndex(0);
        setResolvedCards([]);
    };

    const inspectedTooltip = inspectedId ? tooltips.get(inspectedId) ?? null : null;
    const inspectedCard = inspectedId
        ? cards.find((card) => card.definitionId === inspectedId) ?? null
        : null;

    return (
        <>
        <ModalShell
            variant="cyan"
            rootClassName="card-reward"
            panelClassName="card-reward__panel"
        >
            <div className="card-reward__scroll">
                <p className="card-reward__eyebrow">{eyebrow}</p>

                {step === 'choose' ? (
                    <>
                        <h1 className="card-reward__title">{resolvedTitle}</h1>
                        {subtitle && <p className="card-reward__subtitle">{subtitle}</p>}

                        {rules && rules.length > 0 && (
                            <ul className="card-reward__rules">
                                {rules.map((rule) => (
                                    <li key={rule}>{rule}</li>
                                ))}
                            </ul>
                        )}

                        {deckEntries.length > 0 && (
                            <button
                                type="button"
                                className="card-reward__deck-toggle"
                                onClick={() => setDeckPopupOpen(true)}
                            >
                                View your deck ({deck.length})
                            </button>
                        )}

                        <div className="card-reward__choices">
                            {cards.map((card, index) =>
                            {
                                const definition = getCardDefinitionOrThrow(card.definitionId);
                                const poolDirections = getForwardDirectionsForPool(definition.arrowPool);
                                const isSelected = selected.includes(card.definitionId);
                                const isRevealed = index < revealedCount;
                                const tooltip = tooltips.get(card.definitionId);
                                const summary = tooltip?.lines[0] ?? card.blurb;

                                return (
                                    <button
                                        key={`${card.definitionId}-${index}`}
                                        type="button"
                                        className={`card-reward__choice${isSelected ? ' card-reward__choice--selected' : ''}${isRevealed ? ' card-reward__choice--revealed' : ''}${inspectedId === card.definitionId ? ' card-reward__choice--inspected' : ''}`}
                                        onClick={() => toggle(card.definitionId)}
                                    >
                                        <CardChip
                                            definitionId={card.definitionId}
                                            label={card.label}
                                            power={card.power}
                                            size="hand"
                                        />
                                        <span className="card-reward__pool">
                                            {arrowPoolLabel(definition.arrowPool)}
                                        </span>
                                        {poolDirections.length > 0 && (
                                            <span className="card-reward__pool-arrows" aria-hidden="true">
                                                {poolDirections.map((direction) => (
                                                    <DirectionArrowIcon
                                                        key={direction}
                                                        direction={direction}
                                                        className="card-reward__pool-arrow"
                                                    />
                                                ))}
                                            </span>
                                        )}
                                        <span className={`card-reward__tier card-reward__tier--${card.tier}`}>
                                            {card.tier === 1 ? 'Common' : card.tier === 2 ? 'Uncommon' : 'Rare'}
                                        </span>
                                        <span className="card-reward__blurb">{summary}</span>
                                        {synergyHints?.[card.definitionId] && (
                                            <span className="card-reward__synergy">{synergyHints[card.definitionId]}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="card-reward__inspect" role="status">
                            {inspectedTooltip && inspectedCard ? (
                                <>
                                    <strong>{inspectedTooltip.title}</strong>
                                    {inspectedTooltip.lines.map((line, lineIndex) => (
                                        <span key={lineIndex}>{line}</span>
                                    ))}
                                </>
                            ) : (
                                <span>Select a card to read what it does.</span>
                            )}
                        </div>
                    </>
                ) : currentDefinition && (
                    <>
                        <h1 className="card-reward__title">Choose chain direction</h1>
                        <p className="card-reward__subtitle">
                            {currentDefinition.label}
                            {' · '}
                            {directionIndex + 1} / {directionQueue.length}
                        </p>
                        <CardDirectionPicker
                            definitionId={currentDefinition.id}
                            onPick={pickDirection}
                        />
                    </>
                )}
            </div>
            <div className="card-reward__actions">
                {step === 'choose' ? (
                    <>
                        {rerollable && onReroll && (
                            <button type="button" className="card-reward__reroll" onClick={onReroll}>
                                Reroll
                            </button>
                        )}
                        {onSkip && !allowEmptyPick && (
                            <button type="button" className="card-reward__skip" onClick={onSkip}>
                                Skip
                            </button>
                        )}
                        <button
                            type="button"
                            className="card-reward__confirm"
                            disabled={!canConfirmChoose}
                            onClick={handleChooseConfirm}
                        >
                            {confirmLabel}
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" className="card-reward__reroll" onClick={backToChoose}>
                            Back
                        </button>
                    </>
                )}
            </div>
        </ModalShell>
        {deckPopupOpen && (
            <RunDeckViewPopup
                deck={deck}
                onClose={() => setDeckPopupOpen(false)}
            />
        )}
        </>
    );
};
