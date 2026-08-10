import { useMemo, useState } from 'react';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import type { ShopOffer } from '../../game/run/shop';
import { NodeKindIcon } from './NodeKindIcon';

interface ShopOverlayProps {
    offers: ShopOffer[];
    gold: number;
    deck: readonly string[];
    playerHealth: number;
    maxHealth: number;
    onBuyCard: (offer: ShopOffer) => void;
    onBuyBodyMod: (offer: ShopOffer) => void;
    onBuyHeal: (offer: ShopOffer) => void;
    onBuyRemove: (offer: ShopOffer, definitionId: string) => void;
    onContinue: () => void;
}

interface DeckEntry {
    definitionId: string;
    label: string;
    count: number;
}

const buildDeckEntries = (deck: readonly string[]): DeckEntry[] =>
{
    const counts = new Map<string, number>();

    for (const id of deck)
    {
        counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return [ ...counts.entries() ]
        .map(([ definitionId, count ]) => ({
            definitionId,
            count,
            label: getCardDefinitionOrThrow(definitionId).label,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Ripperdoc shop — buy a card, body mod, heal, or remove a deck card.
 */
export const ShopOverlay = ({
    offers,
    gold,
    deck,
    playerHealth,
    maxHealth,
    onBuyCard,
    onBuyBodyMod,
    onBuyHeal,
    onBuyRemove,
    onContinue,
}: ShopOverlayProps) =>
{
    const [ removing, setRemoving ] = useState(false);
    const [ removeOffer, setRemoveOffer ] = useState<ShopOffer | null>(null);
    const [ purchasedIds, setPurchasedIds ] = useState<string[]>([]);
    const deckEntries = useMemo(() => buildDeckEntries(deck), [ deck ]);

    const markPurchased = (offerId: string): void =>
    {
        setPurchasedIds((prev) => (prev.includes(offerId) ? prev : [ ...prev, offerId ]));
    };

    const handleBuy = (offer: ShopOffer): void =>
    {
        if (purchasedIds.includes(offer.id) || gold < offer.price)
        {
            return;
        }

        if (offer.kind === 'remove-card')
        {
            setRemoveOffer(offer);
            setRemoving(true);
            return;
        }

        if (offer.kind === 'card')
        {
            onBuyCard(offer);
        }
        else if (offer.kind === 'body-mod')
        {
            onBuyBodyMod(offer);
        }
        else if (offer.kind === 'heal')
        {
            onBuyHeal(offer);
        }

        markPurchased(offer.id);
    };

    const confirmRemove = (definitionId: string): void =>
    {
        if (!removeOffer)
        {
            return;
        }

        onBuyRemove(removeOffer, definitionId);
        markPurchased(removeOffer.id);
        setRemoving(false);
        setRemoveOffer(null);
    };

    if (removing && removeOffer)
    {
        return (
            <div className="shop-overlay">
                <div className="shop-overlay__panel">
                    <p className="shop-overlay__eyebrow">Ripperdoc</p>
                    <h1 className="shop-overlay__title">Choose a card to remove</h1>
                    <p className="shop-overlay__subtitle">
                        Costs {removeOffer.price} creds. This cannot be undone.
                    </p>
                    <ul className="shop-overlay__deck-list">
                        {deckEntries.map((entry) => (
                            <li key={entry.definitionId}>
                                <button
                                    type="button"
                                    className="shop-overlay__deck-card"
                                    onClick={() => confirmRemove(entry.definitionId)}
                                >
                                    <span>{entry.label}</span>
                                    <span className="shop-overlay__deck-count">×{entry.count}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        className="shop-overlay__continue"
                        onClick={() =>
                        {
                            setRemoving(false);
                            setRemoveOffer(null);
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="shop-overlay">
            <div className="shop-overlay__panel">
                <div className="shop-overlay__header">
                    <span className="shop-overlay__icon">
                        <NodeKindIcon kind="shop" />
                    </span>
                    <div>
                        <p className="shop-overlay__eyebrow">Ripperdoc</p>
                        <h1 className="shop-overlay__title">Chrome &amp; cuts</h1>
                        <p className="shop-overlay__subtitle">
                            Integrity {playerHealth}/{maxHealth} · {gold} creds
                        </p>
                    </div>
                </div>

                <ul className="shop-overlay__offers">
                    {offers.map((offer) =>
                    {
                        const bought = purchasedIds.includes(offer.id);
                        const unaffordable = gold < offer.price;
                        const healFull = offer.kind === 'heal' && playerHealth >= maxHealth;
                        const emptyDeck = offer.kind === 'remove-card' && deck.length === 0;
                        const disabled = bought || unaffordable || healFull || emptyDeck;

                        return (
                            <li key={offer.id}>
                                <button
                                    type="button"
                                    className={`shop-overlay__offer${bought ? ' shop-overlay__offer--bought' : ''}`}
                                    disabled={disabled}
                                    onClick={() => handleBuy(offer)}
                                >
                                    <div className="shop-overlay__offer-main">
                                        <span className="shop-overlay__offer-kind">{offer.kind}</span>
                                        <span className="shop-overlay__offer-label">{offer.label}</span>
                                        <span className="shop-overlay__offer-blurb">{offer.blurb}</span>
                                    </div>
                                    <span className="shop-overlay__offer-price">
                                        {bought ? 'Sold' : `${offer.price}¤`}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <button type="button" className="shop-overlay__continue" onClick={onContinue}>
                    Leave shop
                </button>
            </div>
        </div>
    );
};
