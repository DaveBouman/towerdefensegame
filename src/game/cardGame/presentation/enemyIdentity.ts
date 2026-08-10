/**
 * In-fight enemy identity: accent tint + Craftpix portrait (silhouette fallback).
 * Map nodes stay generic — identity is revealed only when combat starts.
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
    /** Neon accent for frame and label. */
    accent: number;
    /** Fallback glyph when the portrait texture is not loaded. */
    silhouette: EnemySilhouette;
    /** CSS-style hex for Phaser text color. */
    labelColor: string;
    /** Filename under `public/assets/enemies/` (without path). */
    portraitFile?: string;
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
        portraitFile: 'basic.png',
    },
    thornward: {
        accent: 0xf0a030,
        silhouette: 'hexagon',
        labelColor: '#ffc878',
        portraitFile: 'thornward.png',
    },
    saboteur: {
        accent: 0xe74c3c,
        silhouette: 'triangle',
        labelColor: '#ff9a8a',
        portraitFile: 'saboteur.png',
    },
    smokebinder: {
        accent: 0x8aa0b8,
        silhouette: 'circle',
        labelColor: '#c4d0e0',
        portraitFile: 'smokebinder.png',
    },
    warden: {
        accent: 0xa855f7,
        silhouette: 'octagon',
        labelColor: '#d4a8ff',
        portraitFile: 'warden.png',
    },
    'field-medic': {
        accent: 0x2ecc8a,
        silhouette: 'cross',
        labelColor: '#8fe8c0',
        portraitFile: 'field-medic.png',
    },
    gridlock: {
        accent: 0x00c8e0,
        silhouette: 'pillar',
        labelColor: '#7af0ff',
        portraitFile: 'gridlock.png',
    },
    'training-dummy': {
        accent: 0x7a8499,
        silhouette: 'square',
        labelColor: '#b0b8c8',
        portraitFile: 'training-dummy.png',
    },
};

export const getEnemyIdentity = (definitionId: string): EnemyIdentity =>
    ENEMY_IDENTITY[definitionId] ?? DEFAULT_IDENTITY;

/** Phaser texture key for an enemy portrait. */
export const getEnemyPortraitTextureKey = (definitionId: string): string =>
    `enemy-portrait-${definitionId}`;

/** Public URL for a portrait file. */
export const getEnemyPortraitUrl = (portraitFile: string): string =>
    `/assets/enemies/${portraitFile}`;

/** All roster identities that ship a portrait file. */
export const ENEMY_PORTRAIT_ENTRIES = Object.entries(ENEMY_IDENTITY)
    .filter((entry): entry is [string, EnemyIdentity & { portraitFile: string }] =>
        typeof entry[1].portraitFile === 'string')
    .map(([ definitionId, identity ]) => ({
        definitionId,
        textureKey: getEnemyPortraitTextureKey(definitionId),
        url: getEnemyPortraitUrl(identity.portraitFile),
    }));
