import { useMemo, useState } from 'react';
import { describeCardReward } from '../../game/run/rewards';

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
    onConfirm,
    onSkip,
    onReroll,
}: CardRewardOverlayProps) =>
{
    const [ selected, setSelected ] = useState<string[]>([]);
    const cards = useMemo(() => options.map(describeCardReward), [ options ]);

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
            <div className="card-reward__panel">
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

                        return (
                            <button
                                key={`${card.definitionId}-${index}`}
                                type="button"
                                className={`card-reward__card${isSelected ? ' card-reward__card--selected' : ''}`}
                                onClick={() => toggle(card.definitionId)}
                            >
                                <span className="card-reward__card-power">{card.power}</span>
                                <span className="card-reward__card-name">{card.label}</span>
                                <span className="card-reward__card-blurb">{card.blurb}</span>
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
