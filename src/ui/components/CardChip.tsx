import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import type { CardDirection } from '../../game/cardGame/domain/cardDirections';
import { cardVisualCssVars, formatCardPowerLabel, resolveCardVisualStyle } from '../../game/cards/cardVisualUtils';
import { CardBehaviorIcon } from './CardBehaviorIcon';
import { DirectionArrowIcon } from './DirectionArrowIcon';

export interface CardChipProps {
    definitionId: string;
    label?: string;
    power?: number;
    behaviorId?: string;
    /** Chain direction — shown on graveyard / face-up pile chips. */
    arrow?: CardDirection;
    loopArrow?: CardDirection;
    /** Pile stack size — defaults to full hand card dimensions. */
    size?: 'hand' | 'pile';
    faceDown?: boolean;
    className?: string;
    countBadge?: number;
}

const arrowClass = (direction: CardDirection): string =>
    `card-chip__arrow card-chip__arrow--${direction}`;

export const CardChip = ({
    definitionId,
    label,
    power,
    behaviorId,
    arrow,
    loopArrow,
    size = 'hand',
    faceDown = false,
    className = '',
    countBadge,
}: CardChipProps) =>
{
    const definition = getCardDefinitionOrThrow(definitionId);
    const resolvedBehaviorId = behaviorId ?? definition.behaviorId;
    const style = resolveCardVisualStyle(definitionId, resolvedBehaviorId);
    const cssVars = cardVisualCssVars(style);
    const displayLabel = label ?? definition.label;
    const displayPower = power !== undefined ? String(power) : formatCardPowerLabel(definition);
    const classes = [
        'card-chip',
        size === 'pile' ? 'card-chip--pile' : 'card-chip--hand',
        faceDown ? 'card-chip--back' : '',
        className,
    ].filter(Boolean).join(' ');

    if (faceDown)
    {
        return (
            <div className={classes} style={cssVars}>
                {countBadge !== undefined && countBadge > 1 && (
                    <span className="card-chip__badge">×{countBadge}</span>
                )}
                <span className="card-chip__back-mark" aria-hidden="true">◈</span>
            </div>
        );
    }

    return (
        <div className={classes} style={cssVars}>
            {countBadge !== undefined && countBadge > 1 && (
                <span className="card-chip__badge">×{countBadge}</span>
            )}
            {arrow && (
                <span className={arrowClass(arrow)} aria-label={`Arrow ${arrow}`}>
                    <DirectionArrowIcon direction={arrow} />
                </span>
            )}
            {loopArrow && (
                <span className={`${arrowClass(loopArrow)} card-chip__arrow--loop`} aria-label={`Loop ${loopArrow}`}>
                    <DirectionArrowIcon direction={loopArrow} loop />
                </span>
            )}
            <CardBehaviorIcon
                behaviorId={resolvedBehaviorId}
                visualId={definition.visualId}
                className="card-chip__icon"
            />
            <span className="card-chip__label">{displayLabel}</span>
            <span className="card-chip__power">{displayPower}</span>
        </div>
    );
};
