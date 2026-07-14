export interface CardVisualStyle {
    fill: number;
    border: number;
    labelColor: string;
    powerColor: string;
}

/** Keyed by behavior id — add styles when registering new behaviors. */
export const CARD_VISUALS: Record<string, CardVisualStyle> = {
    attack: {
        fill: 0x2a0a18,
        border: 0xff2d95,
        labelColor: '#ffb8dc',
        powerColor: '#ffffff',
    },
    defend: {
        fill: 0x0a1a22,
        border: 0x00e8ff,
        labelColor: '#7af0ff',
        powerColor: '#ffffff',
    },
    joker: {
        fill: 0x1a1808,
        border: 0xfcee0a,
        labelColor: '#fff9b0',
        powerColor: '#fcee0a',
    },
    hazard: {
        fill: 0x2a0a14,
        border: 0xff3b6b,
        labelColor: '#ffb8c8',
        powerColor: '#ff6b8a',
    },
    boost: {
        fill: 0x141a08,
        border: 0xfcee0a,
        labelColor: '#fff9b0',
        powerColor: '#fcee0a',
    },
    'loop-reset': {
        fill: 0x180a28,
        border: 0xa855f7,
        labelColor: '#d8b8ff',
        powerColor: '#c89bff',
    },
    poison: {
        fill: 0x0a2218,
        border: 0x00ff9d,
        labelColor: '#b8ffe0',
        powerColor: '#00ff9d',
    },
    fire: {
        fill: 0x2a1408,
        border: 0xff6b35,
        labelColor: '#ffd4b8',
        powerColor: '#ff9f43',
    },
    curse: {
        fill: 0x1a0a22,
        border: 0xa855f7,
        labelColor: '#d8b8ff',
        powerColor: '#ff2d95',
    },
    fuse: {
        fill: 0x2a1208,
        border: 0xff6b35,
        labelColor: '#ffd4b8',
        powerColor: '#ff9f43',
    },
    courier: {
        fill: 0x0a1828,
        border: 0x00e8ff,
        labelColor: '#7af0ff',
        powerColor: '#00c4dc',
    },
};

export const HAND_CARD_WIDTH = 86;
export const HAND_CARD_HEIGHT = 118;
export const HAND_CARD_GAP = 14;
