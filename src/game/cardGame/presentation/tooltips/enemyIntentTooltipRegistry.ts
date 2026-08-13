import { cardLabel, intentLabel, passiveLabel } from '../../../copy/strings';
import { GAME_RULES, getCardDefinitionOrThrow } from '../../config/cardRegistry';
import { describeBattleModifier } from '../../combat/battleModifiers';
import type { EnemyTurnStep } from '../../domain/types';

export interface EnemyIntentTooltipContent {
    title: string;
    lines: string[];
}

export const resolveEnemyIntentTooltip = (
    step: EnemyTurnStep,
    phase: 'upcoming' | 'executing',
): EnemyIntentTooltipContent =>
{
    const hazardPower = getCardDefinitionOrThrow(GAME_RULES.hazard.definitionId).power;
    const upcoming = phase === 'upcoming';

    switch (step.kind)
    {
        case 'attack':
            return {
                title: cardLabel('attack'),
                lines: [
                    upcoming
                        ? `Will deal ${step.amount ?? 0} damage to you after your turn.`
                        : `Deals ${step.amount ?? 0} damage to you.`,
                    'Enemy shield absorbs damage first.',
                    'Each extra attack you make this round ramps this damage.',
                ],
            };
        case 'shield':
            return {
                title: intentLabel('shield'),
                lines: [
                    upcoming
                        ? `Will gain ${step.amount ?? 0} shield for the next player turn.`
                        : `Gains ${step.amount ?? 0} shield.`,
                    'Your attacks must break shield before hitting enemy health.',
                ],
            };
        case 'place-hazard':
            return {
                title: cardLabel('hazard'),
                lines: [
                    upcoming
                        ? 'Will place a trap on a random empty tile.'
                        : 'Places a trap on a random empty tile.',
                    `Deals ${hazardPower} damage if left undisarmed at the end of your attack.`,
                    'Include it in your chain to disarm it.',
                    'Undisarmed traps scorch that tile for your next turn.',
                ],
            };
        case 'place-siphon':
        {
            const siphonPower = getCardDefinitionOrThrow(GAME_RULES.siphon.definitionId).power;

            return {
                title: cardLabel('siphon'),
                lines: [
                    upcoming
                        ? 'Will place a leech node on a random empty tile.'
                        : 'Places a leech node on a random empty tile.',
                    `Heals the enemy for ${siphonPower} if you do not route it into your chain.`,
                    'Include it in your chain to shut the drain off.',
                ],
            };
        }
        case 'dampen-field':
            return {
                title: passiveLabel('dampenTiles'),
                lines: [
                    upcoming
                        ? 'Will weaken half the tiles (checkerboard) on your next turn.'
                        : 'Weakens half the tiles (checkerboard) this turn.',
                    'Cards on weakened tiles deal reduced damage and armor.',
                    'Route your chain through the live tiles to hit full strength.',
                ],
            };
        case 'lock-column':
        {
            const columnLabel = step.column !== undefined
                ? step.column + 1
                : step.amount ?? '?';

            return {
                title: intentLabel('lock-column'),
                lines: [
                    upcoming
                        ? `Will lock board column ${columnLabel} — you cannot place or move cards there.`
                        : `Locks board column ${columnLabel}.`,
                    'Cards already in that column still activate if chained.',
                    'The previous lock is replaced each time.',
                ],
            };
        }
        case 'nullify-lane':
        {
            const axis = step.axis === 'row' ? 'row' : 'column';
            const indexLabel = axis === 'row'
                ? (step.row !== undefined ? step.row + 1 : step.amount ?? '?')
                : (step.column !== undefined ? step.column + 1 : step.amount ?? '?');

            return {
                title: passiveLabel('nullifyLane'),
                lines: [
                    upcoming
                        ? `Will nullify board ${axis} ${indexLabel}.`
                        : `Nullifies board ${axis} ${indexLabel}.`,
                    'You can still place cards there, but they deal no damage, grant no armor, and fire no step effects.',
                    'Routing still continues through the strip — only the payloads are dead.',
                    'The previous strip is replaced each time.',
                ],
            };
        }
        case 'redirect-hand':
            return {
                title: passiveLabel('handRedirect'),
                lines: [
                    upcoming
                        ? 'Will scramble the arrows on cards in your hand for the rest of this energy round.'
                        : 'Scrambles hand-card arrows for the rest of this energy round.',
                    'Reroute cards are unaffected. Arrows snap back when your energy refills.',
                    'Rebuild your chain — old routes may no longer connect.',
                ],
            };
        case 'battle-mod':
        {
            const stat = step.modifierStat ?? 'enemy-attack';
            const delta = step.modifierDelta ?? 0;
            const label = describeBattleModifier(stat, delta);

            return {
                title: intentLabel('battle-mod'),
                lines: [
                    upcoming
                        ? `Will apply ${label} until your energy refills.`
                        : `Applies ${label}.`,
                    'Stacks with other modifiers and cards in the chain.',
                ],
            };
        }
        case 'heal-ally':
            return {
                title: intentLabel('ally-heal'),
                lines: [
                    upcoming
                        ? `Will heal an ally for ${step.amount ?? 0} HP.`
                        : `Heals an ally for ${step.amount ?? 0} HP.`,
                    'Targets the weakest living ally when multiple hostiles are present.',
                ],
            };
        case 'shield-ally':
            return {
                title: intentLabel('ally-shield'),
                lines: [
                    upcoming
                        ? `Will grant an ally +${step.amount ?? 0} shield.`
                        : `Grants an ally +${step.amount ?? 0} shield.`,
                    'Targets the weakest living ally when multiple hostiles are present.',
                ],
            };
    }
};
