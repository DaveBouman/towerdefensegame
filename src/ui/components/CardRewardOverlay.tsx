import { useMemo, useState } from 'react';
import { describeCardReward } from '../../game/run/rewards';

interface CardRewardOverlayProps {
    /** Card definition ids offered as choices. */
    options: string[];
    /** How many cards the player keeps. */
    pickCount: number;
    /** Whether the player may reroll the offered choices. */
    rerollable: boolean;
    onConfirm: (definitionIds: string[]) => void;
    onSkip: () => void;
    onReroll?: () => void;
}

export const CardRewardOverlay = ({
    options,
    pickCount,
    rerollable,
    onConfirm,
    onSkip,
    onReroll,
}: CardRewardOverlayProps) =>
{
    const [ selected, setSelected ] = useState<string[]>([]);
    const cards = useMemo(() => options.map(describeCardReward), [ options ]);

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
                // Replace the oldest selection when the pick limit is reached.
                return [ ...prev.slice(1), definitionId ];
            }

            return [ ...prev, definitionId ];
        });
    };

    const canConfirm = selected.length === Math.min(pickCount, cards.length);

    return (
        <div className="card-reward">
            <div className="card-reward__panel">
                <p className="card-reward__eyebrow">Victory spoils</p>
                <h1 className="card-reward__title">
                    {pickCount > 1 ? `Add ${pickCount} cards to your deck` : 'Add a card to your deck'}
                </h1>

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
                    <button type="button" className="card-reward__skip" onClick={onSkip}>
                        Skip
                    </button>
                    <button
                        type="button"
                        className="card-reward__confirm"
                        disabled={!canConfirm}
                        onClick={() => onConfirm(selected)}
                    >
                        Take {selected.length > 0 ? `(${selected.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};
