import { getBodyModDefinitionOrThrow } from '../game/run/bodyMods';
import { getRunMaxHealth } from '../game/run/runResources';
import {
    removeMatchingDeckEntry,
    setMatchingDeckEntryArrow,
    type RunDeckCard,
    type RunDeckEntry,
} from '../game/run/runDeck';
import { upgradeMatchingDeckEntry } from '../game/run/cardUpgrades';
import type { CardDirection } from '../game/cardGame/domain/cardDirections';
import type { ShopOffer } from '../game/run/shop';

export interface ShopWalletState {
    gold: number;
    deck: readonly RunDeckCard[];
    bodyMods: readonly string[];
    playerHealth: number;
}

export interface ShopPurchaseResult {
    gold: number;
    deck: RunDeckCard[];
    bodyMods: string[];
    playerHealth: number;
    unlockCardIds: string[];
    unlockBodyModIds: string[];
    playHealSfx: boolean;
}

const reject = (state: ShopWalletState): null => null;

/** Pure shop purchase resolutions — return null when the buy is illegal. */
export const applyShopCardPurchase = (
    state: ShopWalletState,
    offer: ShopOffer,
    card: RunDeckCard,
): ShopPurchaseResult | null =>
{
    if (state.gold < offer.price)
    {
        return reject(state);
    }

    return {
        gold: state.gold - offer.price,
        deck: [ ...state.deck, card ],
        bodyMods: [ ...state.bodyMods ],
        playerHealth: state.playerHealth,
        unlockCardIds: [ card.definitionId ],
        unlockBodyModIds: [],
        playHealSfx: false,
    };
};

export const applyShopBodyModPurchase = (
    state: ShopWalletState,
    offer: ShopOffer,
): ShopPurchaseResult | null =>
{
    if (!offer.bodyModId || state.gold < offer.price || state.bodyMods.includes(offer.bodyModId))
    {
        return reject(state);
    }

    getBodyModDefinitionOrThrow(offer.bodyModId);
    const nextMods = [ ...state.bodyMods, offer.bodyModId ];

    return {
        gold: state.gold - offer.price,
        deck: [ ...state.deck ],
        bodyMods: nextMods,
        playerHealth: Math.min(getRunMaxHealth(nextMods), state.playerHealth),
        unlockCardIds: [],
        unlockBodyModIds: [ offer.bodyModId ],
        playHealSfx: false,
    };
};

export const applyShopHealPurchase = (
    state: ShopWalletState,
    offer: ShopOffer,
    maxHealth: number,
): ShopPurchaseResult | null =>
{
    if (state.gold < offer.price || !offer.healAmount)
    {
        return reject(state);
    }

    return {
        gold: state.gold - offer.price,
        deck: [ ...state.deck ],
        bodyMods: [ ...state.bodyMods ],
        playerHealth: Math.min(maxHealth, state.playerHealth + offer.healAmount),
        unlockCardIds: [],
        unlockBodyModIds: [],
        playHealSfx: true,
    };
};

export const applyShopRemovePurchase = (
    state: ShopWalletState,
    offer: ShopOffer,
    entry: RunDeckEntry,
): ShopPurchaseResult | null =>
{
    if (state.gold < offer.price)
    {
        return reject(state);
    }

    return {
        gold: state.gold - offer.price,
        deck: removeMatchingDeckEntry(state.deck, entry),
        bodyMods: [ ...state.bodyMods ],
        playerHealth: state.playerHealth,
        unlockCardIds: [],
        unlockBodyModIds: [],
        playHealSfx: false,
    };
};

export const applyShopReroutePurchase = (
    state: ShopWalletState,
    offer: ShopOffer,
    entry: RunDeckEntry,
    arrow: CardDirection,
): ShopPurchaseResult | null =>
{
    if (state.gold < offer.price)
    {
        return reject(state);
    }

    return {
        gold: state.gold - offer.price,
        deck: setMatchingDeckEntryArrow(state.deck, entry, arrow),
        bodyMods: [ ...state.bodyMods ],
        playerHealth: state.playerHealth,
        unlockCardIds: [],
        unlockBodyModIds: [],
        playHealSfx: false,
    };
};

export const applyShopUpgradePurchase = (
    state: ShopWalletState,
    offer: ShopOffer,
    entry: RunDeckEntry,
): ShopPurchaseResult | null =>
{
    if (state.gold < offer.price)
    {
        return reject(state);
    }

    const nextDeck = upgradeMatchingDeckEntry(state.deck, entry);

    if (!nextDeck)
    {
        return reject(state);
    }

    return {
        gold: state.gold - offer.price,
        deck: nextDeck,
        bodyMods: [ ...state.bodyMods ],
        playerHealth: state.playerHealth,
        unlockCardIds: [],
        unlockBodyModIds: [],
        playHealSfx: false,
    };
};
