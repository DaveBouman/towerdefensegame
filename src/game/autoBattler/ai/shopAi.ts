import { AUTO_BATTLER_RULES } from '../config/rules';
import {
    buyOffer,
    firstEmptySlot,
    rerollShop,
    sellTeamUnit,
} from '../shop';
import type { PlayerShopState } from '../types';
import { getUnitDefinitionOrThrow } from '../unitRegistry';

const unitScore = (definitionId: string): number =>
{
    const def = getUnitDefinitionOrThrow(definitionId);

    return def.tier * 10 + def.attack + def.health;
};

const weakestTeamUid = (state: PlayerShopState): string | null =>
{
    let worst: { uid: string; score: number } | null = null;

    for (const unit of state.team)
    {
        if (!unit)
        {
            continue;
        }

        const score = unitScore(unit.definitionId);

        if (!worst || score < worst.score)
        {
            worst = { uid: unit.uid, score };
        }
    }

    return worst?.uid ?? null;
};

/**
 * Deterministic greedy AI: fill empty slots, upgrade weak units, reroll when stuck.
 */
export const runShopAiTurn = (
    initial: PlayerShopState,
    runSeed: string,
    maxActions = 24,
): PlayerShopState =>
{
    let state = {
        ...initial,
        team: initial.team.map((slot) => (slot ? { ...slot } : null)),
        offers: initial.offers.map((offer) => ({ ...offer })),
    };

    for (let action = 0; action < maxActions; action++)
    {
        const empty = firstEmptySlot(state.team);
        const affordable = state.offers
            .filter(() => state.gold >= AUTO_BATTLER_RULES.buyCost)
            .slice()
            .sort((a, b) => unitScore(b.definitionId) - unitScore(a.definitionId));

        if (empty >= 0 && affordable[0])
        {
            const next = buyOffer(state, affordable[0].uid);

            if (next)
            {
                state = next;
                continue;
            }
        }

        if (empty < 0 && affordable[0])
        {
            const bestOfferScore = unitScore(affordable[0].definitionId);
            const weakUid = weakestTeamUid(state);

            if (weakUid)
            {
                const weak = state.team.find((unit) => unit?.uid === weakUid);

                if (weak && unitScore(weak.definitionId) + 2 < bestOfferScore)
                {
                    const sold = sellTeamUnit(state, weakUid);

                    if (sold)
                    {
                        state = sold;
                        continue;
                    }
                }
            }
        }

        if (
            empty >= 0
            && state.gold >= AUTO_BATTLER_RULES.rerollCost + AUTO_BATTLER_RULES.buyCost
        )
        {
            const rerolled = rerollShop(state, runSeed);

            if (rerolled)
            {
                state = rerolled;
                continue;
            }
        }

        break;
    }

    return state;
};
