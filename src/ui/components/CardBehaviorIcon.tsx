import { getCardBehaviorIconUrl } from '../icons/cardBehaviorIcons';
import { CraftpixIcon } from './CraftpixIcon';

interface CardBehaviorIconProps {
    behaviorId: string;
    className?: string;
}

export const CardBehaviorIcon = ({ behaviorId, className }: CardBehaviorIconProps) =>
{
    const src = getCardBehaviorIconUrl(behaviorId);

    if (!src)
    {
        return null;
    }

    return <CraftpixIcon src={src} className={className} />;
};
