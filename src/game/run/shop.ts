import { pickRandom } from '../random/rng';
import { getBodyModDefinition, rollBodyModReward } from './bodyMods';
import { listUpgradableCardsInDeck } from './cardUpgrades';
import { fromDefinitionIds } from './runDeck';
import { describeCardReward, rollCardReward } from './rewards';

export type ShopOfferKind = 'card' | 'body-mod' | 'heal' | 'remove-card' | 'upgrade-card';

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
    upgradeCard: 60,
} as const;

export const SHOP_HEAL_AMOUNT = 22;

/**
 * Seeded Ripperdoc stock for a shop node. Call after
 * `seedScope(seed, \`shop:${nodeId}\`)`.
 */
export const rollShopOffers = (
    ownedBodyMods: readonly string[],
    deckDefinitionIds: readonly string[] = [],
    floor = 1,
): ShopOffer[] =>
{
    const cardId = rollCardReward(1, 'standard', { deckDefinitionIds, floor })[0]!;
    const card = describeCardReward(cardId);
    const offers: ShopOffer[] = [
        {
            id: 'card',
            kind: 'card',
            price: SHOP_PRICES.card,
            label: card.label,
            blurb: `Tier ${card.tier}. ${card.blurb}`,
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

    if (listUpgradableCardsInDeck(fromDefinitionIds(deckDefinitionIds)).length > 0)
    {
        offers.splice(1, 0, {
            id: 'upgrade-card',
            kind: 'upgrade-card',
            price: SHOP_PRICES.upgradeCard,
            label: 'Chrome Grind',
            blurb: 'Upgrade one card in your deck (permanent for this run).',
        });
    }

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
        const extras = rollCardReward(4, 'standard', { deckDefinitionIds, floor })
            .filter((id) => id !== cardId);

        if (extras.length > 0)
        {
            const extraId = pickRandom(extras);
            const extra = describeCardReward(extraId);

            offers.splice(1, 0, {
                id: 'card-extra',
                kind: 'card',
                price: SHOP_PRICES.card,
                label: extra.label,
                blurb: `Tier ${extra.tier}. ${extra.blurb}`,
                cardId: extraId,
            });
        }
    }

    return offers;
};
