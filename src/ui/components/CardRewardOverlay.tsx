import { useEffect, useMemo, useState } from 'react';
import { describeCardReward } from '../../game/run/rewards';
import { CardChip } from './CardChip';
import { CyberPanelChrome } from './CyberPanel';

interface CardRewardOverlayProps {
    /** Card definition ids offered as choices. */
    options: string[];
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
    onConfirm: (definitionIds: string[]) => void;
    onSkip?: () => void;
    onReroll?: () => void;
}

export const CardRewardOverlay = ({
    options,
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
    const cards = useMemo(() => options.map(describeCardReward), [ options ]);

    useEffect(() =>
    {
        setSelected([]);
        setRevealedCount(0);

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

    const canConfirm = allowEmptyPick
        ? selected.length <= pickCount
        : selected.length === Math.min(pickCount, cards.length);

    const confirmLabel = selected.length > 0
        ? `Take ${selected.length === 1 ? cards.find((card) => card.definitionId === selected[0])?.label ?? 'card' : `(${selected.length})`}`
        : 'Take nothing';

    return (
        <div className="card-reward">
            <div className="cp-overlay__backdrop" aria-hidden="true" />
            <div className="card-reward__panel cp-panel cp-panel--cyan">
                <CyberPanelChrome variant="cyan" />
                <p className="card-reward__eyebrow">{eyebrow}</p>
                <h1 className="card-reward__title">{resolvedTitle}</h1>
                {subtitle && <p className="card-reward__subtitle">{subtitle}</p>}

                {rules && rules.length > 0 && (
                    <ul className="card-reward__rules">
                        {rules.map((rule) => (
                            <li key={rule}>{rule}</li>
                        ))}
                    </ul>
                )}

                <div className="card-reward__choices">
                    {cards.map((card, index) =>
                    {
                        const isSelected = selected.includes(card.definitionId);
                        const isRevealed = index < revealedCount;

                        return (
                            <button
                                key={`${card.definitionId}-${index}`}
                                type="button"
                                className={`card-reward__choice${isSelected ? ' card-reward__choice--selected' : ''}${isRevealed ? ' card-reward__choice--revealed' : ''}`}
                                onClick={() => toggle(card.definitionId)}
                            >
                                <CardChip
                                    definitionId={card.definitionId}
                                    label={card.label}
                                    power={card.power}
                                    size="hand"
                                />
                                <span className={`card-reward__tier card-reward__tier--${card.tier}`}>
                                    {card.tier === 1 ? 'Common' : card.tier === 2 ? 'Uncommon' : 'Rare'}
                                </span>
                                <span className="card-reward__blurb">{card.blurb}</span>
                                {synergyHints?.[card.definitionId] && (
                                    <span className="card-reward__synergy">{synergyHints[card.definitionId]}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="card-reward__actions">
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
                        disabled={!canConfirm}
                        onClick={() => onConfirm(selected)}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
