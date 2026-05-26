import type { WorldPosition } from '../grid/types';

export interface AxisAlignedBox {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export const boxFromCenter = (
    center: WorldPosition,
    halfWidth: number,
    halfHeight: number,
): AxisAlignedBox =>
({
    left: center.x - halfWidth,
    top: center.y - halfHeight,
    right: center.x + halfWidth,
    bottom: center.y + halfHeight,
});

export const boxesOverlap = (a: AxisAlignedBox, b: AxisAlignedBox): boolean =>
    a.left < b.right
    && a.right > b.left
    && a.top < b.bottom
    && a.bottom > b.top;
