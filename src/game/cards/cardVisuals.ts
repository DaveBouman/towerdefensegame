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
    joker: {
        fill: 0x4a3a1f,
        border: 0xf1c40f,
        labelColor: '#fff3c4',
        powerColor: '#f1c40f',
    },
    hazard: {
        fill: 0x3a1a2a,
        border: 0xff6b6b,
        labelColor: '#ffd5d5',
        powerColor: '#ff9f43',
    },
};

export const HAND_CARD_WIDTH = 80;
export const HAND_CARD_HEIGHT = 108;
export const HAND_CARD_GAP = 18;
