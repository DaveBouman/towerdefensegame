/**
 * In-fight enemy identity stand-ins (tint + silhouette).
 * Map nodes stay generic — these only apply once combat starts.
 * Replace silhouettes with real character art later; keep `accent` if useful.
 */

export type EnemySilhouette =
    | 'diamond'
    | 'hexagon'
    | 'triangle'
    | 'circle'
    | 'octagon'
    | 'cross'
    | 'square'
    | 'pillar';

export interface EnemyIdentity {
    /** Neon accent for frame, avatar, and label. */
    accent: number;
    /** Temporary glyph until character art exists. */
    silhouette: EnemySilhouette;
    /** CSS-style hex for Phaser text color. */
    labelColor: string;
}

const DEFAULT_IDENTITY: EnemyIdentity = {
    accent: 0xff2d95,
    silhouette: 'diamond',
    labelColor: '#ff8ec4',
};

/** Per-enemy visual identity keyed by `enemies.json` id. */
export const ENEMY_IDENTITY: Record<string, EnemyIdentity> = {
    basic: {
        accent: 0xff2d95,
        silhouette: 'diamond',
        labelColor: '#ff8ec4',
    },
    thornward: {
        accent: 0xf0a030,
        silhouette: 'hexagon',
        labelColor: '#ffc878',
    },
    saboteur: {
        accent: 0xe74c3c,
        silhouette: 'triangle',
        labelColor: '#ff9a8a',
    },
    smokebinder: {
        accent: 0x8aa0b8,
        silhouette: 'circle',
        labelColor: '#c4d0e0',
    },
    warden: {
        accent: 0xa855f7,
        silhouette: 'octagon',
        labelColor: '#d4a8ff',
    },
    'field-medic': {
        accent: 0x2ecc8a,
        silhouette: 'cross',
        labelColor: '#8fe8c0',
    },
    gridlock: {
        accent: 0x00c8e0,
        silhouette: 'pillar',
        labelColor: '#7af0ff',
    },
    'training-dummy': {
        accent: 0x7a8499,
        silhouette: 'square',
        labelColor: '#b0b8c8',
    },
};

export const getEnemyIdentity = (definitionId: string): EnemyIdentity =>
    ENEMY_IDENTITY[definitionId] ?? DEFAULT_IDENTITY;
