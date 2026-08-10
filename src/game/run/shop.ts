import { pickRandom } from '../random/rng';
import { getBodyModDefinition, rollBodyModReward } from './bodyMods';
import { describeCardReward, rollCardReward } from './rewards';

export type ShopOfferKind = 'card' | 'body-mod' | 'heal' | 'remove-card';

export interface ShopOffer {
    id: string;
    kind: ShopOfferKind;
    price: number;
    label: string;
    blurb: string;
    /** Card definition id when kind is `card`. */
    cardId?: string;
    /** Body mod id when kind is `body-mod`. */
    bodyModId?: string;
    /** Integrity restored when kind is `heal`. */
    healAmount?: number;
}

export const SHOP_PRICES = {
    card: 45,
    bodyMod: 80,
    heal: 35,
    removeCard: 50,
} as const;

export const SHOP_HEAL_AMOUNT = 22;

/**
 * Seeded Ripperdoc stock for a shop node. Call after
 * `seedScope(seed, \`shop:${nodeId}\`)`.
 */
export const rollShopOffers = (
    ownedBodyMods: readonly string[],
    deckDefinitionIds: readonly string[] = [],
): ShopOffer[] =>
{
    const cardId = rollCardReward(1, 'standard', deckDefinitionIds)[0]!;
    const card = describeCardReward(cardId);
    const offers: ShopOffer[] = [
        {
            id: 'card',
            kind: 'card',
            price: SHOP_PRICES.card,
            label: card.label,
            blurb: card.blurb,
            cardId,
        },
        {
            id: 'heal',
            kind: 'heal',
            price: SHOP_PRICES.heal,
            label: 'Integrity Patch',
            blurb: `Restore ${SHOP_HEAL_AMOUNT} Integrity (capped at max).`,
            healAmount: SHOP_HEAL_AMOUNT,
        },
        {
            id: 'remove-card',
            kind: 'remove-card',
            price: SHOP_PRICES.removeCard,
            label: 'Deck Excision',
            blurb: 'Permanently remove one card from your run deck.',
        },
    ];

    const bodyModId = rollBodyModReward(ownedBodyMods);

    if (bodyModId)
    {
        const mod = getBodyModDefinition(bodyModId)!;

        offers.splice(1, 0, {
            id: 'body-mod',
            kind: 'body-mod',
            price: SHOP_PRICES.bodyMod,
            label: mod.label,
            blurb: mod.effect,
            bodyModId,
        });
    }
    else
    {
        // Already fully chrome'd — offer a second random card instead.
        const extras = rollCardReward(4, 'standard', deckDefinitionIds).filter((id) => id !== cardId);

        if (extras.length > 0)
        {
            const extraId = pickRandom(extras);
            const extra = describeCardReward(extraId);

            offers.splice(1, 0, {
                id: 'card-extra',
                kind: 'card',
                price: SHOP_PRICES.card,
                label: extra.label,
                blurb: extra.blurb,
                cardId: extraId,
            });
        }
    }

    return offers;
};
