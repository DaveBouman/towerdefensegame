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
                title: 'Attack',
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
                title: 'Shield',
                lines: [
                    upcoming
                        ? `Will gain ${step.amount ?? 0} shield for the next player turn.`
                        : `Gains ${step.amount ?? 0} shield.`,
                    'Your attacks must break shield before hitting enemy health.',
                ],
            };
        case 'place-hazard':
            return {
                title: 'Trap',
                lines: [
                    upcoming
                        ? 'Will place a trap on a random empty tile.'
                        : 'Places a trap on a random empty tile.',
                    `Deals ${hazardPower} damage if left undisarmed at the end of your attack.`,
                    'Include it in your chain to disarm it.',
                    'Undisarmed traps scorch that tile for your next turn.',
                ],
            };
        case 'dampen-field':
            return {
                title: 'Dead Zone',
                lines: [
                    upcoming
                        ? 'Will weaken half the tiles (checkerboard) on your next turn.'
                        : 'Weakens half the tiles (checkerboard) this turn.',
                    'Cards on weakened tiles deal reduced damage and armor.',
                    'Route your chain through the live tiles to hit full strength.',
                ],
            };
        case 'battle-mod':
        {
            const stat = step.modifierStat ?? 'enemy-attack';
            const delta = step.modifierDelta ?? 0;
            const label = describeBattleModifier(stat, delta);

            return {
                title: 'Battle modifier',
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
                title: 'Ally heal',
                lines: [
                    upcoming
                        ? `Will heal an ally for ${step.amount ?? 0} HP.`
                        : `Heals an ally for ${step.amount ?? 0} HP.`,
                    'Targets the weakest living ally when multiple hostiles are present.',
                ],
            };
        case 'shield-ally':
            return {
                title: 'Ally shield',
                lines: [
                    upcoming
                        ? `Will grant an ally +${step.amount ?? 0} shield.`
                        : `Grants an ally +${step.amount ?? 0} shield.`,
                    'Targets the weakest living ally when multiple hostiles are present.',
                ],
            };
    }
};
