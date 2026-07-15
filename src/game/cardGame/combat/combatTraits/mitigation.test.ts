import { describe, expect, it } from 'vitest';
import { createEnemyCombatant } from '../../domain/enemyCombatants';
import { applyEnemyHitMitigation } from './mitigation';

describe('combatTraits mitigation', () =>
{
    it('caps each card hit to the configured maximum', () =>
    {
        const combatant = createEnemyCombatant('enemy-0', 'thornward');

        expect(applyEnemyHitMitigation(combatant, 20)).toEqual({ damage: 5, blocked: false });
        expect(applyEnemyHitMitigation(combatant, 3)).toEqual({ damage: 3, blocked: false });
    });

    it('fully blocks the first N card hits', () =>
    {
        const combatant = createEnemyCombatant('enemy-0', 'warden');

        expect(applyEnemyHitMitigation(combatant, 12)).toEqual({ damage: 0, blocked: true });
        expect(applyEnemyHitMitigation(combatant, 12)).toEqual({ damage: 0, blocked: true });
        expect(applyEnemyHitMitigation(combatant, 12)).toEqual({ damage: 0, blocked: true });
        expect(applyEnemyHitMitigation(combatant, 12)).toEqual({ damage: 12, blocked: false });
    });
});
