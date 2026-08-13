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

    it('describes Null Strip for a telegraphed column', () =>
    {
        const tooltip = resolveEnemyIntentTooltip(
            { kind: 'nullify-lane', axis: 'column', column: 2, amount: 3 },
            'upcoming',
        );

        expect(tooltip.title).toBe('Null Strip');
        expect(tooltip.lines.some((line) => line.includes('column 3'))).toBe(true);
        expect(tooltip.lines.some((line) => line.includes('no damage'))).toBe(true);
    });

    it('describes Signal Twist hand redirect', () =>
    {
        const tooltip = resolveEnemyIntentTooltip({ kind: 'redirect-hand' }, 'upcoming');

        expect(tooltip.title).toBe('Signal Twist');
        expect(tooltip.lines.some((line) => line.includes('scramble'))).toBe(true);
        expect(tooltip.lines.some((line) => line.includes('energy round'))).toBe(true);
    });

    it('describes leech node placement', () =>
    {
        const tooltip = resolveEnemyIntentTooltip({ kind: 'place-siphon' }, 'upcoming');

        expect(tooltip.title).toBe('Leech Node');
        expect(tooltip.lines.some((line) => line.includes('heals') || line.includes('Heals'))).toBe(true);
        expect(tooltip.lines.some((line) => line.includes('chain'))).toBe(true);
    });
});
