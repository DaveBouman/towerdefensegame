import { pickRandom, seedScope } from '../random/rng';
import { AUTO_BATTLER_RULES, tierForTurn } from './config/rules';
import type { PlayerShopState, ShopOffer, Team, UnitInstance } from './types';
import { createUnitInstance, getUnitsForTier } from './unitRegistry';

const emptyTeam = (): Team =>
    Array.from({ length: AUTO_BATTLER_RULES.teamSize }, () => null);

export const createEmptyShopState = (): PlayerShopState =>
    ({
        gold: AUTO_BATTLER_RULES.startingGold,
        tier: 1,
        turn: 1,
        lives: AUTO_BATTLER_RULES.startingLives,
        wins: 0,
        team: emptyTeam(),
        offers: [],
    });

const rollOffer = (tier: number): ShopOffer =>
{
    const pool = getUnitsForTier(tier);

    if (pool.length === 0)
    {
        throw new Error(`No units available for tier ${tier}`);
    }

    const def = pickRandom(pool);

    return {
        uid: createUnitInstance(def.id).uid,
        definitionId: def.id,
        frozen: false,
    };
};

export const refillShopOffers = (
    state: PlayerShopState,
    runSeed: string,
    scope: string,
): PlayerShopState =>
{
    seedScope(runSeed, scope);
    const kept = state.offers.filter((offer) => offer.frozen);
    const offers = [ ...kept ];

    while (offers.length < AUTO_BATTLER_RULES.shopSize)
    {
        offers.push(rollOffer(state.tier));
    }

    return { ...state, offers };
};

export const beginShopTurn = (
    state: PlayerShopState,
    runSeed: string,
): PlayerShopState =>
{
    const turn = state.turn;
    const tier = tierForTurn(turn);
    const next: PlayerShopState = {
        ...state,
        gold: AUTO_BATTLER_RULES.goldPerTurn,
        tier,
        offers: state.offers.map((offer) => ({ ...offer })),
        team: state.team.map((slot) => (slot ? { ...slot } : null)),
    };

    return refillShopOffers(next, runSeed, `shop:${turn}`);
};

export const startNewRunShop = (runSeed: string): PlayerShopState =>
    beginShopTurn(createEmptyShopState(), runSeed);

export const firstEmptySlot = (team: Team): number =>
    team.findIndex((slot) => slot === null);

export const buyOffer = (
    state: PlayerShopState,
    offerUid: string,
): PlayerShopState | null =>
{
    if (state.gold < AUTO_BATTLER_RULES.buyCost)
    {
        return null;
    }

    const offerIndex = state.offers.findIndex((offer) => offer.uid === offerUid);

    if (offerIndex < 0)
    {
        return null;
    }

    const slot = firstEmptySlot(state.team);

    if (slot < 0)
    {
        return null;
    }

    const offer = state.offers[offerIndex]!;
    const unit = createUnitInstance(offer.definitionId);
    const team = [ ...state.team ];
    team[slot] = unit;
    const offers = state.offers.filter((_, index) => index !== offerIndex);

    return {
        ...state,
        gold: state.gold - AUTO_BATTLER_RULES.buyCost,
        team,
        offers,
    };
};

export const sellTeamUnit = (
    state: PlayerShopState,
    unitUid: string,
): PlayerShopState | null =>
{
    const slot = state.team.findIndex((unit) => unit?.uid === unitUid);

    if (slot < 0)
    {
        return null;
    }

    const team = [ ...state.team ];
    team[slot] = null;

    return {
        ...state,
        gold: state.gold + AUTO_BATTLER_RULES.sellReward,
        team,
    };
};

export const rerollShop = (
    state: PlayerShopState,
    runSeed: string,
): PlayerShopState | null =>
{
    if (state.gold < AUTO_BATTLER_RULES.rerollCost)
    {
        return null;
    }

    const spent: PlayerShopState = {
        ...state,
        gold: state.gold - AUTO_BATTLER_RULES.rerollCost,
        offers: state.offers.map((offer) => ({ ...offer, frozen: offer.frozen })),
    };

    // Drop unfrozen, keep frozen, refill.
    spent.offers = spent.offers.filter((offer) => offer.frozen);

    return refillShopOffers(spent, runSeed, `reroll:${state.turn}:${state.gold}`);
};

export const toggleFreezeOffer = (
    state: PlayerShopState,
    offerUid: string,
): PlayerShopState | null =>
{
    const offers = state.offers.map((offer) =>
        offer.uid === offerUid ? { ...offer, frozen: !offer.frozen } : offer);

    if (offers.every((offer, index) => offer === state.offers[index]))
    {
        return null;
    }

    return { ...state, offers };
};

export const moveTeamUnit = (
    state: PlayerShopState,
    fromIndex: number,
    toIndex: number,
): PlayerShopState | null =>
{
    if (
        fromIndex < 0
        || toIndex < 0
        || fromIndex >= state.team.length
        || toIndex >= state.team.length
        || fromIndex === toIndex
    )
    {
        return null;
    }

    const team = [ ...state.team ];
    const moving = team[fromIndex] ?? null;
    team[fromIndex] = team[toIndex] ?? null;
    team[toIndex] = moving;

    return { ...state, team };
};

export const compactTeam = (team: Team): UnitInstance[] =>
    team.filter((slot): slot is UnitInstance => slot !== null);

export const teamFromUnits = (units: readonly UnitInstance[]): Team =>
{
    const team = emptyTeam();

    for (let i = 0; i < Math.min(units.length, team.length); i++)
    {
        team[i] = { ...units[i]! };
    }

    return team;
};
