import { getCardBehaviorIconSvg } from '../icons/cardBehaviorIcons';

interface CardBehaviorIconProps {
    behaviorId: string;
    className?: string;
}

export const CardBehaviorIcon = ({ behaviorId, className }: CardBehaviorIconProps) =>
{
    const svg = getCardBehaviorIconSvg(behaviorId);

    if (!svg)
    {
        return null;
    }

    return (
        <span
            className={className}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};
