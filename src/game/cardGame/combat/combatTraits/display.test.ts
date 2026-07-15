import { describe, expect, it } from 'vitest';
import { COMBAT_TRAIT_TEXTURE_KEY } from '../../../../ui/icons/combatTraitIcons';
import { normalizeCombatTraits } from './defaults';
import { resolveCombatTraitTooltip } from './display';

describe('combatTraits display', () =>
{
    it('defines an icon texture for every combat trait id', () =>
    {
        const traits = normalizeCombatTraits([ 'damageCap', 'hitWard' ]);

        for (const trait of traits)
        {
            expect(COMBAT_TRAIT_TEXTURE_KEY[trait.id].length).toBeGreaterThan(0);
        }
    });

    it('describes configured trait values in tooltips', () =>
    {
        const damageCap = resolveCombatTraitTooltip(
            normalizeCombatTraits([ { id: 'damageCap', maxPerCard: 5 } ])[0]!,
        );
        const hitWard = resolveCombatTraitTooltip(
            normalizeCombatTraits([ { id: 'hitWard', hitsBlocked: 3 } ])[0]!,
        );

        expect(damageCap.lines[0]).toContain('5 damage');
        expect(hitWard.lines[0]).toContain('3 card hit');
    });
});
