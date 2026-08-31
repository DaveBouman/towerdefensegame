import type { ViewportRect } from '../../game/board/tutorialViewportRects';

interface TutorialTargetRingProps {
    rect: ViewportRect;
    label: string;
    secondary?: boolean;
}

export const TutorialTargetRing = ({ rect, label, secondary = false }: TutorialTargetRingProps) =>
{
    const pad = secondary ? 8 : 12;
    const x = rect.x - pad;
    const y = rect.y - pad;
    const width = rect.width + pad * 2;
    const height = rect.height + pad * 2;

    return (
        <div
            className={[
                'tutorial-coach-overlay__target',
                secondary ? 'tutorial-coach-overlay__target--secondary' : '',
            ].filter(Boolean).join(' ')}
            style={{ left: x, top: y, width, height }}
        >
            <span className="tutorial-coach-overlay__target-label">{label}</span>
        </div>
    );
};
