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
    broodframe: {
        accent: 0xff6b35,
        silhouette: 'hexagon',
        labelColor: '#ffb088',
        portraitFile: 'warden.png',
    },
    'wire-drone': {
        accent: 0x48dbfb,
        silhouette: 'diamond',
        labelColor: '#b8f7ff',
        portraitFile: 'basic.png',
    },
    android: {
        accent: 0xb2bec3,
        silhouette: 'octagon',
        labelColor: '#e0e8f4',
        portraitFile: 'saboteur.png',
    },
    'android-arm': {
        accent: 0xe17055,
        silhouette: 'triangle',
        labelColor: '#ffc878',
        portraitFile: 'thornward.png',
    },
    'android-core': {
        accent: 0x00cec9,
        silhouette: 'circle',
        labelColor: '#8fe8c0',
        portraitFile: 'field-medic.png',
    },
    'android-legs': {
        accent: 0x0984e3,
        silhouette: 'pillar',
        labelColor: '#9fd4ff',
        portraitFile: 'gridlock.png',
    },
    'training-dummy': {
        accent: 0x7a8499,
        silhouette: 'square',
        labelColor: '#b0b8c8',
        portraitFile: 'training-dummy.png',
    },
    'cred-vulture': {
        accent: 0xffd166,
        silhouette: 'circle',
        labelColor: '#ffe8a0',
        portraitFile: 'saboteur.png',
    },
    'toll-bot': {
        accent: 0x9b59b6,
        silhouette: 'square',
        labelColor: '#d4a8ff',
        portraitFile: 'gridlock.png',
    },
    'wire-thief': {
        accent: 0x1abc9c,
        silhouette: 'triangle',
        labelColor: '#7af0d8',
        portraitFile: 'smokebinder.png',
    },
    'null-scribe': {
        accent: 0x6c5ce7,
        silhouette: 'hexagon',
        labelColor: '#b8b0ff',
        portraitFile: 'smokebinder.png',
    },
    'stutter-node': {
        accent: 0xff9f43,
        silhouette: 'diamond',
        labelColor: '#ffc878',
        portraitFile: 'thornward.png',
    },
    'phantom-relay': {
        accent: 0x74b9ff,
        silhouette: 'octagon',
        labelColor: '#b8dcff',
        portraitFile: 'warden.png',
    },
    'vector-haunt': {
        accent: 0xd4a5ff,
        silhouette: 'hexagon',
        labelColor: '#e6c8ff',
        portraitFile: 'smokebinder.png',
    },
    'drain-host': {
        accent: 0x3dffb0,
        silhouette: 'circle',
        labelColor: '#b8ffe0',
        portraitFile: 'field-medic.png',
    },
    'twin-clip': {
        accent: 0xd63031,
        silhouette: 'cross',
        labelColor: '#ff9a8a',
        portraitFile: 'basic.png',
    },
    'bulwark-runner': {
        accent: 0x00b894,
        silhouette: 'pillar',
        labelColor: '#8fe8c0',
        portraitFile: 'field-medic.png',
    },
    'glass-striker': {
        accent: 0xfd79a8,
        silhouette: 'diamond',
        labelColor: '#ffb8d0',
        portraitFile: 'basic.png',
    },
    'chrome-saint': {
        accent: 0x55efc4,
        silhouette: 'hexagon',
        labelColor: '#b8ffe8',
        portraitFile: 'field-medic.png',
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
