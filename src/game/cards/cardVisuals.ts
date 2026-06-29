export interface CardVisualStyle {
    fill: number;
    border: number;
    labelColor: string;
    powerColor: string;
}

/** Keyed by behavior id — add styles when registering new behaviors. */
export const CARD_VISUALS: Record<string, CardVisualStyle> = {
    attack: {
        fill: 0x6b2d3c,
        border: 0xe74c3c,
        labelColor: '#ffd5d5',
        powerColor: '#ffffff',
    },
    defend: {
        fill: 0x1f4a3a,
        border: 0x2ecc71,
        labelColor: '#d5ffe8',
        powerColor: '#ffffff',
    },
};

export const HAND_CARD_WIDTH = 80;
export const HAND_CARD_HEIGHT = 108;
export const HAND_CARD_GAP = 18;
