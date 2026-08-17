import { getCardBehaviorIconUrl } from '../icons/cardBehaviorIcons';
import { CraftpixIcon } from './CraftpixIcon';

interface CardBehaviorIconProps {
    behaviorId: string;
    visualId?: string;
    className?: string;
}

export const CardBehaviorIcon = ({ behaviorId, visualId, className }: CardBehaviorIconProps) =>
{
    const src = (visualId ? getCardBehaviorIconUrl(visualId) : null)
        ?? getCardBehaviorIconUrl(behaviorId);

    if (!src)
    {
        return null;
    }

    return <CraftpixIcon src={src} className={className} />;
};
