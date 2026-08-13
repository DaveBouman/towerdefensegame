import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import { getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import {
    getCardRewardWeight,
    scoreDeckArchetypes,
} from './deckArchetypes';
import {
    ELITE_REWARD_CARD_POOL,
    REWARD_CARD_POOL,
    flattenRunReward,
    getCardTierOfferWeight,
    rewardForNodeKind,
    rollCardReward,
} from './rewards';
import { BODY_MOD_DEFINITIONS } from './bodyMods';
import { upgradeFirstCardInDeck } from './cardUpgrades';
import { rollShopOffers, SHOP_HEAL_AMOUNT, SHOP_PRICES } from './shop';

describe('rewards', () =>
{
    it('uses standard card rewards for street ops and compound rewards for lieutenants', () =>
    {
        expect(rewardForNodeKind('enemy')).toMatchObject({
            kind: 'card',
            pool: 'standard',
            choiceCount: 3,
            pickCount: 1,
        });
        expect(rewardForNodeKind('semi-boss')).toMatchObject({
            kind: 'compound',
        });
        expect(flattenRunReward(rewardForNodeKind('semi-boss')!)).toHaveLength(2);
        expect(rewardForNodeKind('boss')).toMatchObject({
            kind: 'body-mod',
            pool: 'warden',
        });
        expect(rewardForNodeKind('shop')).toBeUndefined();
    });

    it('rolls elite rewards only from the elite pool', () =>
    {
        seedScope('elite-reward-pool', 'reward:test:0');
        const picks = rollCardReward(3, 'elite');

        expect(picks).toHaveLength(3);
        expect(picks.every((id) => ELITE_REWARD_CARD_POOL.includes(id))).toBe(true);
        expect(picks.every((id) => REWARD_CARD_POOL.includes(id))).toBe(true);
        expect(picks.includes('attack')).toBe(false);
        expect(picks.includes('defend')).toBe(false);
    });

    it('weaves toxin decks toward poison-tagged rewards', () =>
    {
        const toxinDeck = [
            'attack', 'defend', 'poison', 'poison', 'miasma', 'miasma', 'echo',
        ];
        const scores = scoreDeckArchetypes(toxinDeck);

        expect(scores.dominant).toBe('toxin');
        expect(getCardRewardWeight('miasma', scores))
            .toBeGreaterThan(getCardRewardWeight('rupture', scores));
        expect(getCardRewardWeight('poison', scores))
            .toBeGreaterThan(getCardRewardWeight('cinder', scores));
    });

    it('favors higher tiers on later floors', () =>
    {
        expect(getCardTierOfferWeight(3, 3)).toBeGreaterThan(getCardTierOfferWeight(3, 1));
        expect(getCardTierOfferWeight(1, 1)).toBeGreaterThan(getCardTierOfferWeight(1, 3));
    });
});

describe('card upgrades', () =>
{
    it('upgrades the first matching deck copy', () =>
    {
        const next = upgradeFirstCardInDeck(
            [
                { definitionId: 'attack' },
                { definitionId: 'defend' },
                { definitionId: 'attack' },
            ],
            'attack',
        );

        expect(next).toEqual([
            { definitionId: 'attack-plus' },
            { definitionId: 'defend' },
            { definitionId: 'attack' },
        ]);
        expect(getCardDefinitionOrThrow('attack-plus').label).toBe('Attack+');
    });
});

describe('shop', () =>
{
    it('rolls seeded ripperdoc offers including heal, remove, and upgrade', () =>
    {
        seedScope('shop-test', 'shop:n1-0');
        const offers = rollShopOffers([], [ 'attack', 'defend' ], 1);

        expect(offers.some((offer) => offer.kind === 'card')).toBe(true);
        expect(offers.some((offer) => offer.kind === 'body-mod')).toBe(true);
        expect(offers.some((offer) => offer.kind === 'heal' && offer.healAmount === SHOP_HEAL_AMOUNT)).toBe(true);
        expect(offers.some((offer) => offer.kind === 'remove-card' && offer.price === SHOP_PRICES.removeCard)).toBe(true);
        expect(offers.some((offer) => offer.kind === 'upgrade-card' && offer.price === SHOP_PRICES.upgradeCard)).toBe(true);
    });

    it('replaces body-mod with an extra card when all mods are owned', () =>
    {
        seedScope('shop-full-chrome', 'shop:n2-0');
        const owned = BODY_MOD_DEFINITIONS.map((mod) => mod.id);
        const offers = rollShopOffers(owned);

        expect(offers.every((offer) => offer.kind !== 'body-mod')).toBe(true);
        expect(offers.filter((offer) => offer.kind === 'card').length).toBeGreaterThanOrEqual(2);
    });
});
