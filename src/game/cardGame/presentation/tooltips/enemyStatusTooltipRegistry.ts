import { overclockStatusName } from '../../../copy/strings';
import { GAME_RULES } from '../../config/cardRegistry';
import type { GameTooltipContent } from './GameTooltipController';

export const resolveOverclockTooltip = (
    currentBonus: number,
    nextBonus: number,
): GameTooltipContent =>
{
    const perTurn = GAME_RULES.enemyStrengthPerTurn;
    const ramp = GAME_RULES.enemyDamageRampPerAttack;
    const lines: string[] = [];

    if (currentBonus <= 0 && nextBonus > 0)
    {
        lines.push(`Activates at +${nextBonus} attack after the enemy's first response this fight.`);
    }
    else
    {
        lines.push(
            `Enemies hit +${currentBonus} harder on every attack for the rest of this fight.`,
        );

        if (nextBonus > currentBonus)
        {
            lines.push(`After their next response: +${nextBonus}.`);
        }
    }

    lines.push(`Stacks +${perTurn} each time they respond.`);
    lines.push(`Each extra attack you make this round also ramps their next hit (+${ramp}).`);

    return {
        title: overclockStatusName(),
        lines,
    };
};
