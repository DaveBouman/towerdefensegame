import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import { HAND_CARD_HEIGHT, HAND_CARD_WIDTH } from '../../game/cards/cardVisuals';
import { cardVisualCssVars, resolveCardVisualStyle } from '../../game/cards/cardVisualUtils';
import { CardBehaviorIcon } from './CardBehaviorIcon';

export interface CardChipProps {
    definitionId: string;
    label?: string;
    power?: number;
    behaviorId?: string;
    /** Pile stack size — defaults to full hand card dimensions. */
    size?: 'hand' | 'pile';
    faceDown?: boolean;
    className?: string;
    countBadge?: number;
}

export const CardChip = ({
    definitionId,
    label,
    power,
    behaviorId,
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
    const displayPower = power ?? definition.power;
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
            <CardBehaviorIcon behaviorId={resolvedBehaviorId} className="card-chip__icon" />
            <span className="card-chip__label">{displayLabel}</span>
            <span className="card-chip__power">{displayPower}</span>
        </div>
    );
};

export const CARD_CHIP_HAND_WIDTH = HAND_CARD_WIDTH;
export const CARD_CHIP_HAND_HEIGHT = HAND_CARD_HEIGHT;
