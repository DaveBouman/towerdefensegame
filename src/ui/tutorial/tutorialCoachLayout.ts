export interface ViewportRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface HostSize {
    width: number;
    height: number;
}

export const pickBubblePosition = (
    target: ViewportRect | null,
    bubbleWidth: number,
    bubbleHeight: number,
    hostSize: HostSize,
    margin = 16,
): { left: number; top: number } =>
{
    const left = Math.max(margin, (hostSize.width - bubbleWidth) / 2);

    if (!target)
    {
        return {
            left,
            top: Math.max(margin, (hostSize.height - bubbleHeight) / 2),
        };
    }

    const targetCenterY = target.y + target.height / 2;

    if (targetCenterY < hostSize.height * 0.55)
    {
        return {
            left,
            top: Math.max(margin, hostSize.height - bubbleHeight - margin),
        };
    }

    return {
        left,
        top: margin,
    };
};
