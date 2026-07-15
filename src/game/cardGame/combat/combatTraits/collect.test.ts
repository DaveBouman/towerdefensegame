import { describe, expect, it } from 'vitest';
import { getCardGameEnemyDefinitionOrThrow } from '../../config/enemyCatalog';
import { collectCombatTraitsFromBodyMods } from './collect';
import { normalizeCombatTraits } from './defaults';

describe('combatTraits collect', () =>
{
    it('loads combat traits from enemy definitions', () =>
    {
        const thornward = getCardGameEnemyDefinitionOrThrow('thornward');
        const warden = getCardGameEnemyDefinitionOrThrow('warden');

        expect(thornward.combatTraits).toEqual(
            normalizeCombatTraits([ { id: 'damageCap', maxPerCard: 5 } ]),
        );
        expect(warden.combatTraits).toEqual(
            normalizeCombatTraits([ { id: 'hitWard', hitsBlocked: 3 } ]),
        );
    });

    it('aggregates combat traits granted by body mods', () =>
    {
        const traits = collectCombatTraitsFromBodyMods([
            'chrome-heart',
            'reactive-plating',
        ]);

        expect(traits).toEqual(
            normalizeCombatTraits([ { id: 'hitWard', hitsBlocked: 2 } ]),
        );
    });
});
