import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import {
    arrowPoolLabel,
    formatDirectionLabel,
    getDirectionsForPool,
    type CardDirection,
} from '../../game/cardGame/domain/cardDirections';
import { CardChip } from './CardChip';
import { DirectionArrowIcon } from './DirectionArrowIcon';

interface CardDirectionPickerProps {
    definitionId: string;
    /** e.g. "1 / 2" progress copy */
    progress?: string;
    onPick: (direction: CardDirection) => void;
}

/** Arrow grid for a single card — used by rewards, shop, and event flows. */
export const CardDirectionPicker = ({
    definitionId,
    progress,
    onPick,
}: CardDirectionPickerProps) =>
{
    const definition = getCardDefinitionOrThrow(definitionId);
    const directions = getDirectionsForPool(definition.arrowPool);

    return (
        <div className="card-direction-picker">
            <div className="card-direction-picker__preview">
                <CardChip
                    definitionId={definitionId}
                    label={definition.label}
                    size="hand"
                />
            </div>
            {progress && <p className="card-direction-picker__progress">{progress}</p>}
            <p className="card-direction-picker__hint">
                {arrowPoolLabel(definition.arrowPool)}
            </p>
            <div className="card-direction-picker__grid">
                {directions.map((direction) => (
                    <button
                        key={direction}
                        type="button"
                        className="card-direction-picker__btn"
                        onClick={() => onPick(direction)}
                    >
                        <DirectionArrowIcon direction={direction} />
                        <span>{formatDirectionLabel(direction)}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

import { cardNeedsDirectionPick } from '../../game/run/runDeck';
