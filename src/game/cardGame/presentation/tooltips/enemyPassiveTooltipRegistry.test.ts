import { describe, expect, it } from 'vitest';
import { ENEMY_PASSIVE_TEXTURE_KEY } from '../../../../ui/icons/enemyPassiveIcons';
import { normalizeEnemyPassives } from '../../enemyPassives/defaults';
import { resolveEnemyPassiveTooltip } from './enemyPassiveTooltipRegistry';

describe('enemyPassiveTooltipRegistry', () =>
{
    it('defines an icon texture for every passive id', () =>
    {
        const passives = normalizeEnemyPassives([
            'thorns',
            'enrage',
            'lastStand',
            'smoke',
            'wetBlanket',
            'silenceTile',
            'loopHunter',
            'jammer',
        ]);

        for (const passive of passives)
        {
            expect(ENEMY_PASSIVE_TEXTURE_KEY[passive.id].length).toBeGreaterThan(0);
        }
    });

    it('describes enrage without duplicating trap explosion', () =>
    {
        const tooltip = resolveEnemyPassiveTooltip(
            normalizeEnemyPassives([ { id: 'enrage', attackBonusPerTrap: 3, extraTrapsPerTrap: 1 } ])[0]!,
        );

        expect(tooltip.title).toBe('Enrage');
        expect(tooltip.lines[0]).toContain('still explode');
        expect(tooltip.lines.some((line) => line.includes('+3 attack'))).toBe(true);
    });

    it('uses configured values in passive tooltips', () =>
    {
        const thorns = resolveEnemyPassiveTooltip(
            normalizeEnemyPassives([ { id: 'thorns', reflectDamage: 4 } ])[0]!,
        );
        const jammer = resolveEnemyPassiveTooltip(
            normalizeEnemyPassives([ { id: 'jammer', minChainLength: 5, shieldGain: 8 } ])[0]!,
        );

        expect(thorns.lines[0]).toContain('4 damage');
        expect(jammer.lines[0]).toContain('5+ cards');
        expect(jammer.lines[0]).toContain('8 shield');
    });
});
