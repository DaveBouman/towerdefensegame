import { describe, expect, it } from 'vitest';
import {
    ENEMY_IDENTITY,
    ENEMY_PORTRAIT_ENTRIES,
    getEnemyIdentity,
    getEnemyPortraitTextureKey,
} from './enemyIdentity';

describe('enemyIdentity', () =>
{
    it('gives every roster enemy a distinct accent and silhouette', () =>
    {
        const roster = Object.keys(ENEMY_IDENTITY);
        const accents = new Set(roster.map((id) => ENEMY_IDENTITY[id]!.accent));
        const silhouettes = new Set(roster.map((id) => ENEMY_IDENTITY[id]!.silhouette));

        expect(roster.length).toBeGreaterThanOrEqual(6);
        expect(accents.size).toBe(roster.length);
        expect(silhouettes.size).toBe(roster.length);
    });

    it('ships a portrait file for every roster enemy', () =>
    {
        const roster = Object.keys(ENEMY_IDENTITY);

        expect(ENEMY_PORTRAIT_ENTRIES).toHaveLength(roster.length);
        expect(new Set(ENEMY_PORTRAIT_ENTRIES.map((e) => e.definitionId)).size).toBe(roster.length);
        expect(getEnemyPortraitTextureKey('gridlock')).toBe('enemy-portrait-gridlock');
    });

    it('falls back for unknown definition ids', () =>
    {
        const fallback = getEnemyIdentity('unknown-host');

        expect(fallback.accent).toBe(ENEMY_IDENTITY.basic!.accent);
        expect(fallback.silhouette).toBe(ENEMY_IDENTITY.basic!.silhouette);
        expect(fallback.portraitFile).toBeUndefined();
    });
});
