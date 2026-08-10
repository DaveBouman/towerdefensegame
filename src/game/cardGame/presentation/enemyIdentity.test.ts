import { describe, expect, it } from 'vitest';
import { ENEMY_IDENTITY, getEnemyIdentity } from './enemyIdentity';

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

    it('falls back for unknown definition ids', () =>
    {
        expect(getEnemyIdentity('unknown-host')).toEqual(getEnemyIdentity('basic'));
    });
});
