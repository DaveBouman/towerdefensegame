import { unlockBodyMods } from '../game/run/bodyModBestiary';
import { unlockCards } from '../game/run/cardCollection';
import { emitRunSfx } from '../game/audio/emitRunSfx';
import {
    applyShopBodyModPurchase,
    applyShopCardPurchase,
    applyShopHealPurchase,
    applyShopRemovePurchase,
    applyShopReroutePurchase,
    applyShopUpgradePurchase,
    type ShopPurchaseResult,
} from './shopPurchases';
import type { ShopOffer } from '../game/run/shop';
import type { RunDeckCard, RunDeckEntry } from '../game/run/runDeck';
import type { CardDirection } from '../game/cardGame/domain/cardDirections';

type ShopStateSetters = {
    gold: number;
    deck: RunDeckCard[];
    bodyMods: string[];
    playerHealth: number;
    runMaxHealth: number;
    setGold: (value: number | ((prev: number) => number)) => void;
    setDeck: (value: RunDeckCard[] | ((prev: RunDeckCard[]) => RunDeckCard[])) => void;
    setBodyMods: (value: string[] | ((prev: string[]) => string[])) => void;
    setPlayerHealth: (value: number | ((prev: number) => number)) => void;
};

const commitShopPurchase = (
    result: ShopPurchaseResult | null,
    setters: Pick<ShopStateSetters, 'setGold' | 'setDeck' | 'setBodyMods' | 'setPlayerHealth'>,
): boolean =>
{
    if (!result)
    {
        return false;
    }

    setters.setGold(result.gold);
    setters.setDeck(result.deck);
    setters.setBodyMods(result.bodyMods);
    setters.setPlayerHealth(result.playerHealth);
    unlockCards(result.unlockCardIds);
    unlockBodyMods(result.unlockBodyModIds);
    emitRunSfx('shop-buy', { volume: 0.95 });

    if (result.playHealSfx)
    {
        emitRunSfx('heal', { volume: 0.85 });
    }

    return true;
};

/** Builds shop buy handlers that read latest wallet state via `getState`. */
export const createShopPurchaseHandlers = (getState: () => ShopStateSetters) =>
{
    const wallet = () =>
    {
        const state = getState();

        return {
            gold: state.gold,
            deck: state.deck,
            bodyMods: state.bodyMods,
            playerHealth: state.playerHealth,
        };
    };

    const setters = () =>
    {
        const state = getState();

        return {
            setGold: state.setGold,
            setDeck: state.setDeck,
            setBodyMods: state.setBodyMods,
            setPlayerHealth: state.setPlayerHealth,
        };
    };

    return {
        confirmShopCardPurchase: (offer: ShopOffer, card: RunDeckCard): void =>
        {
            commitShopPurchase(applyShopCardPurchase(wallet(), offer, card), setters());
        },
        buyShopBodyMod: (offer: ShopOffer): void =>
        {
            commitShopPurchase(applyShopBodyModPurchase(wallet(), offer), setters());
        },
        buyShopHeal: (offer: ShopOffer): void =>
        {
            const state = getState();
            commitShopPurchase(
                applyShopHealPurchase(wallet(), offer, state.runMaxHealth),
                setters(),
            );
        },
        buyShopRemove: (offer: ShopOffer, entry: RunDeckEntry): void =>
        {
            commitShopPurchase(applyShopRemovePurchase(wallet(), offer, entry), setters());
        },
        buyShopReroute: (offer: ShopOffer, entry: RunDeckEntry, arrow: CardDirection): void =>
        {
            commitShopPurchase(applyShopReroutePurchase(wallet(), offer, entry, arrow), setters());
        },
        buyShopUpgrade: (offer: ShopOffer, entry: RunDeckEntry): void =>
        {
            commitShopPurchase(applyShopUpgradePurchase(wallet(), offer, entry), setters());
        },
    };
};
