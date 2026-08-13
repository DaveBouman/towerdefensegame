import { useMemo, useState } from 'react';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import { listUpgradableCardsInDeck } from '../../game/run/cardUpgrades';
import type { ShopOffer } from '../../game/run/shop';
import type { RunDeckCard } from '../../game/run/runDeck';
import { toDefinitionIds } from '../../game/run/runDeck';
import { NodeKindIcon } from './NodeKindIcon';
import { ModalShell } from './CyberPanel';

interface ShopOverlayProps {
    offers: ShopOffer[];
    gold: number;
    deck: readonly RunDeckCard[];
    playerHealth: number;
    maxHealth: number;
    onBuyCard: (offer: ShopOffer) => void;
    onBuyBodyMod: (offer: ShopOffer) => void;
    onBuyHeal: (offer: ShopOffer) => void;
    onBuyRemove: (offer: ShopOffer, definitionId: string) => void;
    onBuyUpgrade: (offer: ShopOffer, definitionId: string) => void;
    onContinue: () => void;
}

interface DeckEntry {
    definitionId: string;
    label: string;
    count: number;
}

const buildDeckEntries = (deck: readonly RunDeckCard[], ids: readonly string[]): DeckEntry[] =>
{
    const allowed = new Set(ids);
    const counts = new Map<string, number>();

    for (const card of deck)
    {
        if (!allowed.has(card.definitionId))
        {
            continue;
        }

        counts.set(card.definitionId, (counts.get(card.definitionId) ?? 0) + 1);
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
 * Ripperdoc shop — buy a card, body mod, heal, upgrade, or remove a deck card.
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
    onBuyUpgrade,
    onContinue,
}: ShopOverlayProps) =>
{
    const [ picking, setPicking ] = useState<'remove' | 'upgrade' | null>(null);
    const [ activeOffer, setActiveOffer ] = useState<ShopOffer | null>(null);
    const [ purchasedIds, setPurchasedIds ] = useState<string[]>([]);
    const removeEntries = useMemo(
        () => buildDeckEntries(deck, [ ...new Set(toDefinitionIds(deck)) ]),
        [ deck ],
    );
    const upgradeEntries = useMemo(
        () => buildDeckEntries(deck, listUpgradableCardsInDeck(deck)),
        [ deck ],
    );

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
            setActiveOffer(offer);
            setPicking('remove');
            return;
        }

        if (offer.kind === 'upgrade-card')
        {
            setActiveOffer(offer);
            setPicking('upgrade');
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

    const confirmPick = (definitionId: string): void =>
    {
        if (!activeOffer || !picking)
        {
            return;
        }

        if (picking === 'remove')
        {
            onBuyRemove(activeOffer, definitionId);
        }
        else
        {
            onBuyUpgrade(activeOffer, definitionId);
        }

        markPurchased(activeOffer.id);
        setPicking(null);
        setActiveOffer(null);
    };

    if (picking && activeOffer)
    {
        const entries = picking === 'remove' ? removeEntries : upgradeEntries;

        return (
            <ModalShell
                variant="gold"
                rootClassName="shop-overlay shop-overlay--enter"
                panelClassName="shop-overlay__panel"
            >
                    <p className="shop-overlay__eyebrow">Ripperdoc</p>
                    <h1 className="shop-overlay__title">
                        {picking === 'remove' ? 'Choose a card to remove' : 'Choose a card to upgrade'}
                    </h1>
                    <p className="shop-overlay__subtitle">
                        Costs {activeOffer.price} creds. This cannot be undone.
                    </p>
                    <ul className="shop-overlay__deck-list">
                        {entries.map((entry) => (
                            <li key={entry.definitionId}>
                                <button
                                    type="button"
                                    className="shop-overlay__deck-card"
                                    onClick={() => confirmPick(entry.definitionId)}
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
                            setPicking(null);
                            setActiveOffer(null);
                        }}
                    >
                        Cancel
                    </button>
            </ModalShell>
        );
    }

    return (
        <ModalShell
            variant="gold"
            rootClassName="shop-overlay shop-overlay--enter"
            panelClassName="shop-overlay__panel"
        >
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
                        const noUpgrade = offer.kind === 'upgrade-card'
                            && listUpgradableCardsInDeck(deck).length === 0;
                        const disabled = bought || unaffordable || healFull || emptyDeck || noUpgrade;

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
        </ModalShell>
    );
};
