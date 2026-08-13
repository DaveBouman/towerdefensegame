import { useMemo, useState } from 'react';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import type { CardDirection } from '../../game/cardGame/domain/cardDirections';
import { listUpgradableCardsInDeck } from '../../game/run/cardUpgrades';
import type { ShopOffer } from '../../game/run/shop';
import {
    cardNeedsDirectionPick,
    groupRunDeckEntries,
    type RunDeckCard,
    type RunDeckEntry,
} from '../../game/run/runDeck';
import { CardChip } from './CardChip';
import { CardDirectionPicker } from './CardDirectionPicker';
import { NodeKindIcon } from './NodeKindIcon';
import { ModalShell } from './CyberPanel';

interface ShopOverlayProps {
    offers: ShopOffer[];
    gold: number;
    deck: readonly RunDeckCard[];
    playerHealth: number;
    maxHealth: number;
    onConfirmCardPurchase: (offer: ShopOffer, card: RunDeckCard) => void;
    onBuyBodyMod: (offer: ShopOffer) => void;
    onBuyHeal: (offer: ShopOffer) => void;
    onBuyRemove: (offer: ShopOffer, entry: RunDeckEntry) => void;
    onBuyReroute: (offer: ShopOffer, entry: RunDeckEntry, arrow: CardDirection) => void;
    onBuyUpgrade: (offer: ShopOffer, entry: RunDeckEntry) => void;
    onContinue: () => void;
}

type ShopPickMode = 'remove' | 'upgrade' | 'reroute' | 'card-direction';

const entryKey = (entry: RunDeckEntry): string =>
    `${entry.definitionId}:${entry.arrow ?? ''}:${entry.loopArrow ?? ''}`;

/**
 * Ripperdoc shop — buy cards (with direction pick), body mods, heal, reroute, remove, upgrade.
 */
export const ShopOverlay = ({
    offers,
    gold,
    deck,
    playerHealth,
    maxHealth,
    onConfirmCardPurchase,
    onBuyBodyMod,
    onBuyHeal,
    onBuyRemove,
    onBuyReroute,
    onBuyUpgrade,
    onContinue,
}: ShopOverlayProps) =>
{
    const [ picking, setPicking ] = useState<ShopPickMode | null>(null);
    const [ activeOffer, setActiveOffer ] = useState<ShopOffer | null>(null);
    const [ pendingEntry, setPendingEntry ] = useState<RunDeckEntry | null>(null);
    const [ purchasedIds, setPurchasedIds ] = useState<string[]>([]);

    const deckEntries = useMemo(() => groupRunDeckEntries(deck), [ deck ]);
    const removeEntries = deckEntries;
    const rerouteEntries = useMemo(
        () => deckEntries.filter((entry) => cardNeedsDirectionPick(entry.definitionId)),
        [ deckEntries ],
    );
    const upgradeIds = useMemo(() => new Set(listUpgradableCardsInDeck(deck)), [ deck ]);
    const upgradeEntries = useMemo(
        () => deckEntries.filter((entry) => upgradeIds.has(entry.definitionId)),
        [ deckEntries, upgradeIds ],
    );

    const markPurchased = (offerId: string): void =>
    {
        setPurchasedIds((prev) => (prev.includes(offerId) ? prev : [ ...prev, offerId ]));
    };

    const resetPick = (): void =>
    {
        setPicking(null);
        setActiveOffer(null);
        setPendingEntry(null);
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

        if (offer.kind === 'reroute-card')
        {
            setActiveOffer(offer);
            setPicking('reroute');
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
            if (!offer.cardId)
            {
                return;
            }

            if (cardNeedsDirectionPick(offer.cardId))
            {
                setActiveOffer(offer);
                setPicking('card-direction');
                return;
            }

            onConfirmCardPurchase(offer, { definitionId: offer.cardId });
            markPurchased(offer.id);
            return;
        }

        if (offer.kind === 'body-mod')
        {
            onBuyBodyMod(offer);
        }
        else if (offer.kind === 'heal')
        {
            onBuyHeal(offer);
        }

        markPurchased(offer.id);
    };

    const confirmEntryPick = (entry: RunDeckEntry): void =>
    {
        if (!activeOffer || !picking)
        {
            return;
        }

        if (picking === 'reroute')
        {
            setPendingEntry(entry);
            setPicking('card-direction');
            return;
        }

        if (picking === 'remove')
        {
            onBuyRemove(activeOffer, entry);
        }
        else
        {
            onBuyUpgrade(activeOffer, entry);
        }

        markPurchased(activeOffer.id);
        resetPick();
    };

    const confirmCardDirection = (arrow: CardDirection): void =>
    {
        if (!activeOffer)
        {
            return;
        }

        if (pendingEntry && activeOffer.kind === 'reroute-card')
        {
            onBuyReroute(activeOffer, pendingEntry, arrow);
            markPurchased(activeOffer.id);
            resetPick();
            return;
        }

        if (activeOffer.kind === 'card' && activeOffer.cardId)
        {
            onConfirmCardPurchase(activeOffer, { definitionId: activeOffer.cardId, arrow });
            markPurchased(activeOffer.id);
            resetPick();
        }
    };

    if (picking === 'card-direction' && activeOffer)
    {
        const definitionId = pendingEntry?.definitionId ?? activeOffer.cardId;

        if (!definitionId)
        {
            resetPick();
        }
        else
        {
            return (
                <ModalShell
                    variant="gold"
                    rootClassName="shop-overlay shop-overlay--enter"
                    panelClassName="shop-overlay__panel"
                >
                    <p className="shop-overlay__eyebrow">Ripperdoc</p>
                    <h1 className="shop-overlay__title">
                        {activeOffer.kind === 'reroute-card' ? 'Choose new direction' : 'Choose chain direction'}
                    </h1>
                    <p className="shop-overlay__subtitle">
                        {getCardDefinitionOrThrow(definitionId).label} · {activeOffer.price} creds
                    </p>
                    <CardDirectionPicker
                        definitionId={definitionId}
                        onPick={confirmCardDirection}
                    />
                    <button type="button" className="shop-overlay__continue" onClick={resetPick}>
                        Cancel
                    </button>
                </ModalShell>
            );
        }
    }

    if (picking && activeOffer && (picking === 'remove' || picking === 'upgrade' || picking === 'reroute'))
    {
        const entries = picking === 'remove'
            ? removeEntries
            : picking === 'reroute'
                ? rerouteEntries
                : upgradeEntries;

        const pickTitle = picking === 'remove'
            ? 'Choose a card to remove'
            : picking === 'reroute'
                ? 'Choose a card to reroute'
                : 'Choose a card to upgrade';

        return (
            <ModalShell
                variant="gold"
                rootClassName="shop-overlay shop-overlay--enter"
                panelClassName="shop-overlay__panel"
            >
                <p className="shop-overlay__eyebrow">Ripperdoc</p>
                <h1 className="shop-overlay__title">{pickTitle}</h1>
                <p className="shop-overlay__subtitle">
                    Costs {activeOffer.price} creds. {picking === 'remove' ? 'This cannot be undone.' : ''}
                </p>
                <div className="shop-overlay__deck-strip">
                    {entries.map((entry) => (
                        <button
                            key={entryKey(entry)}
                            type="button"
                            className="shop-overlay__deck-pick"
                            onClick={() => confirmEntryPick(entry)}
                        >
                            <CardChip
                                definitionId={entry.definitionId}
                                label={entry.label}
                                arrow={entry.arrow}
                                loopArrow={entry.loopArrow}
                                countBadge={entry.count}
                                size="pile"
                            />
                        </button>
                    ))}
                </div>
                <button type="button" className="shop-overlay__continue" onClick={resetPick}>
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
                    const noReroute = offer.kind === 'reroute-card' && rerouteEntries.length === 0;
                    const noUpgrade = offer.kind === 'upgrade-card' && upgradeEntries.length === 0;
                    const disabled = bought || unaffordable || healFull || emptyDeck || noReroute || noUpgrade;

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
