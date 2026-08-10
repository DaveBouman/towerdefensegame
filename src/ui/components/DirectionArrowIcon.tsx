import type { CardDirection } from '../../game/cardGame/domain/cardDirections';
import { DIRECTION_ARROW_ROTATION_DEG, DIRECTION_ARROW_URL, DIRECTION_LOOP_URL } from '../icons/directionIcons';
import { CraftpixIcon } from './CraftpixIcon';

interface DirectionArrowIconProps {
    direction: CardDirection;
    className?: string;
    loop?: boolean;
}

export const DirectionArrowIcon = ({
    direction,
    className = '',
    loop = false,
}: DirectionArrowIconProps) => (
    <span
        className={[ 'direction-arrow-icon', className ].filter(Boolean).join(' ')}
        style={{
            ['--dir-rot' as string]: `${DIRECTION_ARROW_ROTATION_DEG[direction]}deg`,
        }}
        aria-hidden="true"
    >
        <CraftpixIcon
            src={DIRECTION_ARROW_URL}
            className="direction-arrow-icon__glyph"
        />
        {loop && (
            <CraftpixIcon
                src={DIRECTION_LOOP_URL}
                className="direction-arrow-icon__loop"
            />
        )}
    </span>
);
