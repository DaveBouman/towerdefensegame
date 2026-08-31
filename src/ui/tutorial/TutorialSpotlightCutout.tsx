import type { HostSize, ViewportRect } from './tutorialCoachLayout';

interface TutorialSpotlightCutoutProps {
    rect: ViewportRect;
    hostSize: HostSize;
    label?: string;
}

/** Four-panel dim with a clear pulsing ring on the live click target. */
export const TutorialSpotlightCutout = ({
    rect,
    hostSize,
    label = 'Click here',
}: TutorialSpotlightCutoutProps) =>
{
    const pad = 12;
    const x = Math.max(0, rect.x - pad);
    const y = Math.max(0, rect.y - pad);
    const width = Math.min(hostSize.width - x, rect.width + pad * 2);
    const height = Math.min(hostSize.height - y, rect.height + pad * 2);
    const right = x + width;
    const bottom = y + height;
    const labelBelow = y < hostSize.height * 0.35;

    return (
        <>
            <div
                className="tutorial-coach-overlay__shade"
                style={{ left: 0, top: 0, width: hostSize.width, height: y }}
            />
            <div
                className="tutorial-coach-overlay__shade"
                style={{ left: 0, top: y, width: x, height }}
            />
            <div
                className="tutorial-coach-overlay__shade"
                style={{ left: right, top: y, width: Math.max(0, hostSize.width - right), height }}
            />
            <div
                className="tutorial-coach-overlay__shade"
                style={{ left: 0, top: bottom, width: hostSize.width, height: Math.max(0, hostSize.height - bottom) }}
            />
            <div
                className="tutorial-coach-overlay__target"
                style={{ left: x, top: y, width, height }}
            >
                <span
                    className={[
                        'tutorial-coach-overlay__target-label',
                        labelBelow ? 'tutorial-coach-overlay__target-label--below' : '',
                    ].filter(Boolean).join(' ')}
                >
                    {label}
                </span>
            </div>
        </>
    );
};
