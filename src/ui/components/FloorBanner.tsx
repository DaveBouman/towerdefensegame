import { useEffect } from 'react';

const FLOOR_NAMES: Record<number, string> = {
    1: 'Outer Grid',
    2: 'District Core',
    3: 'Warden Spire',
};

interface FloorBannerProps {
    floor: number;
    onDone: () => void;
}

export const FloorBanner = ({ floor, onDone }: FloorBannerProps) =>
{
    useEffect(() =>
    {
        const timer = window.setTimeout(onDone, 2400);

        return () => window.clearTimeout(timer);
    }, [ floor, onDone ]);

    const name = FLOOR_NAMES[floor] ?? `Floor ${floor}`;

    return (
        <div className="floor-banner" role="status">
            <p className="floor-banner__eyebrow">Entering</p>
            <h2 className="floor-banner__title">Floor {floor}</h2>
            <p className="floor-banner__subtitle">{name}</p>
        </div>
    );
};
