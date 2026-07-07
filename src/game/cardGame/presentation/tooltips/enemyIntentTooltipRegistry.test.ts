import { describe, expect, it } from 'vitest';
import { resolveEnemyIntentTooltip } from './enemyIntentTooltipRegistry';

describe('enemyIntentTooltipRegistry', () =>
{
    it('describes an upcoming attack intent', () =>
    {
        const tooltip = resolveEnemyIntentTooltip({ kind: 'attack', amount: 8 }, 'upcoming');

        expect(tooltip.title).toBe('Attack');
        expect(tooltip.lines[0]).toContain('Will deal 8 damage');
    });

    it('describes an executing shield intent', () =>
    {
        const tooltip = resolveEnemyIntentTooltip({ kind: 'shield', amount: 10 }, 'executing');

        expect(tooltip.title).toBe('Shield');
        expect(tooltip.lines[0]).toContain('Gains 10 shield');
    });

    it('describes trap placement with hazard rules', () =>
    {
        const tooltip = resolveEnemyIntentTooltip({ kind: 'place-hazard' }, 'upcoming');

        expect(tooltip.title).toBe('Trap');
        expect(tooltip.lines.some((line) => line.includes('random empty tile'))).toBe(true);
        expect(tooltip.lines.some((line) => line.includes('scorch'))).toBe(true);
    });

    it('describes the Dead Zone field event', () =>
    {
        const tooltip = resolveEnemyIntentTooltip({ kind: 'dampen-field' }, 'upcoming');

        expect(tooltip.title).toBe('Dead Zone');
        expect(tooltip.lines.some((line) => line.includes('checkerboard'))).toBe(true);
    });
});
