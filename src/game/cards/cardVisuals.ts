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
    shiv: {
        fill: 0x1a0820,
        border: 0xff2d95,
        labelColor: '#ffc0e0',
        powerColor: '#ff6eb8',
    },
    miasma: {
        fill: 0x081a14,
        border: 0x39ff14,
        labelColor: '#b8ffb0',
        powerColor: '#7dff5a',
    },
    cinder: {
        fill: 0x1a1008,
        border: 0xff9f43,
        labelColor: '#ffe0b8',
        powerColor: '#ffb347',
    },
    lacerate: {
        fill: 0x200810,
        border: 0xe74c3c,
        labelColor: '#ffb0a8',
        powerColor: '#ff6b5a',
    },
    scorch: {
        fill: 0x281008,
        border: 0xff4500,
        labelColor: '#ffd0a0',
        powerColor: '#ff8c42',
    },
    bramble: {
        fill: 0x081a10,
        border: 0x2ecc71,
        labelColor: '#b8ffd0',
        powerColor: '#58d68d',
    },
    glitch: {
        fill: 0x101828,
        border: 0x7af0ff,
        labelColor: '#b8f0ff',
        powerColor: '#00e8ff',
    },
    hardwire: {
        fill: 0x081820,
        border: 0x00e8ff,
        labelColor: '#7af0ff',
        powerColor: '#58d68d',
    },
    patch: {
        fill: 0x0a1820,
        border: 0x58d68d,
        labelColor: '#b8ffe0',
        powerColor: '#7af0ff',
    },
    overclock: {
        fill: 0x201008,
        border: 0xfcee0a,
        labelColor: '#fff9b0',
        powerColor: '#fcee0a',
    },
    echo: {
        fill: 0x081820,
        border: 0x5ce1e6,
        labelColor: '#b8f8ff',
        powerColor: '#7af0ff',
    },
};

export const HAND_CARD_WIDTH = 86;
export const HAND_CARD_HEIGHT = 118;
export const HAND_CARD_GAP = 14;

/** Scaled-down cards for deck/graveyard stacks (same aspect as hand cards). */
export const PILE_CARD_WIDTH = 58;
export const PILE_CARD_HEIGHT = 78;
