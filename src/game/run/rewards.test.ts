import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import {
    ELITE_REWARD_CARD_POOL,
    REWARD_CARD_POOL,
    rewardForNodeKind,
    rollCardReward,
} from './rewards';
import { rollShopOffers, SHOP_HEAL_AMOUNT, SHOP_PRICES } from './shop';

describe('rewards', () =>
{
    it('uses standard card rewards for street ops and elite pool for lieutenants', () =>
    {
        expect(rewardForNodeKind('enemy')).toMatchObject({
            kind: 'card',
            pool: 'standard',
            choiceCount: 3,
            pickCount: 1,
        });
        expect(rewardForNodeKind('semi-boss')).toMatchObject({
            kind: 'card',
            pool: 'elite',
            choiceCount: 3,
            pickCount: 1,
        });
        expect(rewardForNodeKind('boss')).toBeUndefined();
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
});

describe('shop', () =>
{
    it('rolls seeded ripperdoc offers including heal and remove', () =>
    {
        seedScope('shop-test', 'shop:n1-0');
        const offers = rollShopOffers([]);

        expect(offers.some((offer) => offer.kind === 'card')).toBe(true);
        expect(offers.some((offer) => offer.kind === 'body-mod')).toBe(true);
        expect(offers.some((offer) => offer.kind === 'heal' && offer.healAmount === SHOP_HEAL_AMOUNT)).toBe(true);
        expect(offers.some((offer) => offer.kind === 'remove-card' && offer.price === SHOP_PRICES.removeCard)).toBe(true);
    });

    it('replaces body-mod with an extra card when all mods are owned', () =>
    {
        seedScope('shop-full-chrome', 'shop:n2-0');
        const owned = [ 'chrome-heart', 'overclock-cell', 'cred-siphon', 'mark-seven', 'reactive-plating' ];
        const offers = rollShopOffers(owned);

        expect(offers.every((offer) => offer.kind !== 'body-mod')).toBe(true);
        expect(offers.filter((offer) => offer.kind === 'card').length).toBeGreaterThanOrEqual(2);
    });
});
