import { describe, expect, it } from 'vitest';
import {
    applyShopBodyModPurchase,
    applyShopCardPurchase,
    applyShopHealPurchase,
    applyShopRemovePurchase,
} from './shopPurchases';
import type { ShopOffer } from '../game/run/shop';
import { SHOP_PRICES } from '../game/run/shop';

const baseState = {
    gold: 100,
    deck: [ { definitionId: 'attack', arrow: 'left' as const } ],
    bodyMods: [] as string[],
    playerHealth: 40,
};

describe('shopPurchases', () =>
{
    it('buys a card and charges gold', () =>
    {
        const offer: ShopOffer = {
            id: 'card',
            kind: 'card',
            price: SHOP_PRICES.card,
            label: 'Fire',
            blurb: 'test',
            cardId: 'fire',
        };
        const result = applyShopCardPurchase(baseState, offer, { definitionId: 'fire', arrow: 'right' });

        expect(result?.gold).toBe(100 - SHOP_PRICES.card);
        expect(result?.deck).toHaveLength(2);
        expect(result?.unlockCardIds).toEqual([ 'fire' ]);
    });

    it('rejects card buys when broke', () =>
    {
        const offer: ShopOffer = {
            id: 'card',
            kind: 'card',
            price: SHOP_PRICES.card,
            label: 'Fire',
            blurb: 'test',
            cardId: 'fire',
        };

        expect(applyShopCardPurchase({ ...baseState, gold: 10 }, offer, { definitionId: 'fire' })).toBeNull();
    });

    it('heals and flags heal sfx', () =>
    {
        const offer: ShopOffer = {
            id: 'heal',
            kind: 'heal',
            price: SHOP_PRICES.heal,
            label: 'Patch',
            blurb: 'test',
            healAmount: 22,
        };
        const result = applyShopHealPurchase(baseState, offer, 80);

        expect(result?.playerHealth).toBe(62);
        expect(result?.playHealSfx).toBe(true);
    });

    it('installs a body mod', () =>
    {
        const offer: ShopOffer = {
            id: 'body-mod',
            kind: 'body-mod',
            price: SHOP_PRICES.bodyMod,
            label: 'Chrome Heart',
            blurb: 'test',
            bodyModId: 'chrome-heart',
        };
        const result = applyShopBodyModPurchase(baseState, offer);

        expect(result?.bodyMods).toEqual([ 'chrome-heart' ]);
        expect(result?.unlockBodyModIds).toEqual([ 'chrome-heart' ]);
    });

    it('removes a deck entry', () =>
    {
        const offer: ShopOffer = {
            id: 'remove-card',
            kind: 'remove-card',
            price: SHOP_PRICES.removeCard,
            label: 'Excise',
            blurb: 'test',
        };
        const result = applyShopRemovePurchase(baseState, offer, {
            definitionId: 'attack',
            label: 'Attack',
            count: 1,
            arrow: 'left',
        });

        expect(result?.deck).toEqual([]);
    });
});
