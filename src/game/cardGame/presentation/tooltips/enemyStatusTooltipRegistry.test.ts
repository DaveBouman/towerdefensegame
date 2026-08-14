import { describe, expect, it } from 'vitest';
import { resolveOverclockTooltip } from './enemyStatusTooltipRegistry';

describe('enemyStatusTooltipRegistry', () =>
{
    it('describes pending overclock before the first enemy response', () =>
    {
        const tooltip = resolveOverclockTooltip(0, 4);

        expect(tooltip.title).toBe('Overclock');
        expect(tooltip.lines[0]).toContain('Activates at +4');
    });

    it('describes active overclock and the next tick', () =>
    {
        const tooltip = resolveOverclockTooltip(4, 8);

        expect(tooltip.lines[0]).toContain('+4 harder');
        expect(tooltip.lines[1]).toContain('+8');
        expect(tooltip.lines.some((line) => line.includes('Stacks +4'))).toBe(true);
    });
});
