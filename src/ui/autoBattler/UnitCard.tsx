import { getUnitDefinitionOrThrow } from '../../game/autoBattler';
import type { ShopOffer, UnitInstance } from '../../game/autoBattler';

interface UnitCardProps {
    definitionId: string;
    attack?: number;
    health?: number;
    frozen?: boolean;
    selected?: boolean;
    dimmed?: boolean;
    footer?: string;
    onClick?: () => void;
}

export const UnitCard = ({
    definitionId,
    attack,
    health,
    frozen,
    selected,
    dimmed,
    footer,
    onClick,
}: UnitCardProps) =>
{
    const def = getUnitDefinitionOrThrow(definitionId);
    const atk = attack ?? def.attack;
    const hp = health ?? def.health;

    return (
        <button
            type="button"
            className={[
                'ab-unit',
                frozen ? 'ab-unit--frozen' : '',
                selected ? 'ab-unit--selected' : '',
                dimmed ? 'ab-unit--dimmed' : '',
                onClick ? 'ab-unit--clickable' : '',
            ].filter(Boolean).join(' ')}
            onClick={onClick}
            title={def.tooltip}
            disabled={!onClick}
        >
            <span className="ab-unit__tier">T{def.tier}</span>
            <span className="ab-unit__name">{def.label}</span>
            <span className="ab-unit__stats">
                <span className="ab-unit__atk">{atk}</span>
                <span className="ab-unit__sep">/</span>
                <span className="ab-unit__hp">{hp}</span>
            </span>
            <span className="ab-unit__tip">{def.tooltip}</span>
            {footer ? <span className="ab-unit__footer">{footer}</span> : null}
        </button>
    );
};

export const unitFromOffer = (offer: ShopOffer): UnitCardProps =>
    ({
        definitionId: offer.definitionId,
        frozen: offer.frozen,
    });

export const unitFromInstance = (unit: UnitInstance): UnitCardProps =>
    ({
        definitionId: unit.definitionId,
        attack: unit.attack,
        health: unit.health,
    });
