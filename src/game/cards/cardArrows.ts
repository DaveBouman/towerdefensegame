import type { CardDirection } from '../cardGame/domain/cardDirections';

export const ARROW_GLYPH: Record<CardDirection, string> = {
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    'up-left': '↖',
    'up-right': '↗',
    'down-left': '↙',
    'down-right': '↘',
};

export const arrowLabelPosition = (
    direction: CardDirection,
    width: number,
    height: number,
): { x: number; y: number } =>
{
    switch (direction)
    {
        case 'up':
            return { x: width / 2, y: height * 0.14 };
        case 'down':
            return { x: width / 2, y: height * 0.86 };
        case 'left':
            return { x: width * 0.16, y: height / 2 };
        case 'right':
            return { x: width * 0.84, y: height / 2 };
        case 'up-left':
            return { x: width * 0.18, y: height * 0.18 };
        case 'up-right':
            return { x: width * 0.82, y: height * 0.18 };
        case 'down-left':
            return { x: width * 0.18, y: height * 0.82 };
        case 'down-right':
            return { x: width * 0.82, y: height * 0.82 };
    }
};
