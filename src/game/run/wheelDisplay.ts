import { WHEEL_SEGMENTS, type WheelSegment } from './runEvents';

export type WheelSegmentTone = 'bad' | 'risky' | 'lucky';

export interface WheelSegmentDisplay extends WheelSegment {
    index: number;
    /** Degrees on the wheel face — larger slices look more likely (RNG stays fair). */
    visualDegrees: number;
    startAngle: number;
    endAngle: number;
    midAngle: number;
    tone: WheelSegmentTone;
    fill: string;
}

/** Visual slice sizes only — each segment still has equal roll weight in `rollWheelSegment`. */
const WHEEL_VISUAL_DEGREES: Record<string, number> = {
    trap: 52,
    burden: 50,
    fuse: 48,
    card: 44,
    trinket: 42,
    'gold-35': 40,
    'gold-20': 38,
    heal: 46,
};

const WHEEL_SEGMENT_TONE: Record<string, WheelSegmentTone> = {
    trap: 'bad',
    burden: 'bad',
    fuse: 'bad',
    card: 'risky',
    trinket: 'risky',
    'gold-20': 'risky',
    'gold-35': 'risky',
    heal: 'lucky',
};

const WHEEL_TONE_FILL: Record<WheelSegmentTone, string> = {
    bad: '#4a1824',
    risky: '#3d2a14',
    lucky: '#1a3d2e',
};

/** Builds display layout for the wheel face (skewed visuals, fair odds). */
export const getWheelDisplayLayout = (): WheelSegmentDisplay[] =>
{
    let cursor = 0;

    return WHEEL_SEGMENTS.map((segment, index) =>
    {
        const visualDegrees = WHEEL_VISUAL_DEGREES[segment.id] ?? (360 / WHEEL_SEGMENTS.length);
        const startAngle = cursor;
        const endAngle = cursor + visualDegrees;
        const midAngle = startAngle + visualDegrees / 2;

        cursor = endAngle;

        const tone = WHEEL_SEGMENT_TONE[segment.id] ?? 'risky';

        return {
            ...segment,
            index,
            visualDegrees,
            startAngle,
            endAngle,
            midAngle,
            tone,
            fill: WHEEL_TONE_FILL[tone],
        };
    });
};

/** CSS conic-gradient for the skewed wheel disc (0° = top). */
export const buildWheelConicGradient = (): string =>
{
    const layout = getWheelDisplayLayout();
    const stops = layout.flatMap((segment) =>
        [ `${segment.fill} ${segment.startAngle}deg`, `${segment.fill} ${segment.endAngle}deg` ],
    );

    return `conic-gradient(from -90deg, ${stops.join(', ')})`;
};

/** Rotation (deg) so the pointer at the top lands on a segment's visual center. */
export const getWheelSpinRotationTarget = (segmentIndex: number, fullRotations = 6): number =>
{
    const layout = getWheelDisplayLayout();
    const segment = layout[segmentIndex];

    if (!segment)
    {
        throw new Error(`Invalid wheel segment index: ${segmentIndex}`);
    }

    return fullRotations * 360 + (360 - segment.midAngle);
};

/** Share of the wheel face taken by curse / damage slices (visual only). */
export const getWheelBadLuckVisualShare = (): number =>
{
    const layout = getWheelDisplayLayout();
    const badDegrees = layout
        .filter((segment) => segment.tone === 'bad')
        .reduce((sum, segment) => sum + segment.visualDegrees, 0);

    return badDegrees / 360;
};
