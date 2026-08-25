import { useMemo, useState, type ReactNode } from 'react';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import type { CardDirection } from '../../game/cardGame/domain/cardDirections';
import { getBodyModVisual } from '../../game/run/bodyModBestiary';
import { listUpgradableCardsInDeck } from '../../game/run/cardUpgrades';
import type { ShopOffer } from '../../game/run/shop';
import {
    cardNeedsDirectionPick,
    groupRunDeckEntries,
    type RunDeckCard,
    type RunDeckEntry,
} from '../../game/run/runDeck';
import { craftpixIconUrl } from '../icons/craftpixIconUrl';
import { EVENT_ICON_URL } from '../icons/eventIcons';
import { CardChip } from './CardChip';
import { CardDirectionPicker } from './CardDirectionPicker';
import { CraftpixIcon } from './CraftpixIcon';
import { DeckCardPicker } from './DeckCardPicker';
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

const isStockOffer = (offer: ShopOffer): boolean =>
    offer.kind === 'card' || offer.kind === 'body-mod';

const SERVICE_ICON_URL: Record<'heal' | 'remove-card' | 'reroute-card' | 'upgrade-card', string> = {
    heal: EVENT_ICON_URL.heal,
    'remove-card': EVENT_ICON_URL.skull,
    'reroute-card': craftpixIconUrl('joker.png'),
    'upgrade-card': craftpixIconUrl('boost.png'),
};

interface OfferState {
    bought: boolean;
    disabled: boolean;
}

const getOfferState = (
    offer: ShopOffer,
    purchasedIds: readonly string[],
    gold: number,
    playerHealth: number,
    maxHealth: number,
    deckLength: number,
    rerouteCount: number,
    upgradeCount: number,
): OfferState =>
{
    const bought = purchasedIds.includes(offer.id);
    const unaffordable = gold < offer.price;
    const healFull = offer.kind === 'heal' && playerHealth >= maxHealth;
    const emptyDeck = offer.kind === 'remove-card' && deckLength === 0;
    const noReroute = offer.kind === 'reroute-card' && rerouteCount === 0;
    const noUpgrade = offer.kind === 'upgrade-card' && upgradeCount === 0;

    return {
        bought,
        disabled: bought || unaffordable || healFull || emptyDeck || noReroute || noUpgrade,
    };
};

const StockTile = ({
    offer,
    state,
    onBuy,
}: {
    offer: ShopOffer;
    state: OfferState;
    onBuy: () => void;
}) =>
{
    let preview: ReactNode = null;
    let kindLabel = 'Stock';

    if (offer.kind === 'card' && offer.cardId)
    {
        kindLabel = 'Card';
        preview = (
            <CardChip
                definitionId={offer.cardId}
                size="pile"
                className="shop-overlay__stock-chip"
            />
        );
    }
    else if (offer.kind === 'body-mod' && offer.bodyModId)
    {
        kindLabel = 'Body mod';
        const visual = getBodyModVisual(offer.bodyModId);

        preview = (
            <span
                className="shop-overlay__mod-plate"
                style={{
                    ['--shop-mod-accent' as string]: visual.accentCss,
                    color: visual.labelColor,
                }}
            >
                <CraftpixIcon src={EVENT_ICON_URL['body-mod']} className="shop-overlay__mod-icon" />
                <span className="shop-overlay__mod-glyph" aria-hidden="true">{visual.glyph}</span>
            </span>
        );
    }

    return (
        <button
            type="button"
            className={`shop-overlay__stock-tile${state.bought ? ' shop-overlay__stock-tile--bought' : ''}`}
            disabled={state.disabled}
            onClick={onBuy}
        >
            <span className="shop-overlay__stock-kind">{kindLabel}</span>
            <span className="shop-overlay__stock-preview">{preview}</span>
            <span className="shop-overlay__stock-label">{offer.label}</span>
            <span className="shop-overlay__stock-blurb">{offer.blurb}</span>
            <span className="shop-overlay__stock-price">
                {state.bought ? 'Sold' : `${offer.price}¤`}
            </span>
        </button>
    );
};

const ServiceTile = ({
    offer,
    state,
    onBuy,
}: {
    offer: ShopOffer;
    state: OfferState;
    onBuy: () => void;
}) =>
{
    if (offer.kind === 'card' || offer.kind === 'body-mod')
    {
        return null;
    }

    return (
        <button
            type="button"
            className={`shop-overlay__service-tile shop-overlay__service-tile--${offer.kind}${state.bought ? ' shop-overlay__service-tile--bought' : ''}`}
            disabled={state.disabled}
            onClick={onBuy}
        >
            <span className="shop-overlay__service-icon-wrap">
                <CraftpixIcon src={SERVICE_ICON_URL[offer.kind]} className="shop-overlay__service-icon" />
            </span>
            <span className="shop-overlay__service-label">{offer.label}</span>
            <span className="shop-overlay__service-blurb">{offer.blurb}</span>
            <span className="shop-overlay__service-price">
                {state.bought ? 'Sold' : `${offer.price}¤`}
            </span>
        </button>
    );
};

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

    const stockOffers = useMemo(() => offers.filter(isStockOffer), [ offers ]);
    const serviceOffers = useMemo(() => offers.filter((offer) => !isStockOffer(offer)), [ offers ]);

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
            <DeckCardPicker
                eyebrow="Ripperdoc"
                title={pickTitle}
                subtitle={`Costs ${activeOffer.price} creds. ${picking === 'remove' ? 'This cannot be undone.' : ''}`}
                entries={entries}
                onPick={(entry) => confirmEntryPick(entry as RunDeckEntry)}
                onCancel={resetPick}
            />
        );
    }

    return (
        <ModalShell
            variant="gold"
            rootClassName="shop-overlay shop-overlay--enter"
            panelClassName="shop-overlay__panel shop-overlay__panel--storefront"
        >
            <div className="shop-overlay__header shop-overlay__header--storefront">
                <div className="shop-overlay__brand">
                    <span className="shop-overlay__icon">
                        <NodeKindIcon kind="shop" />
                    </span>
                    <div>
                        <p className="shop-overlay__eyebrow">Ripperdoc</p>
                        <h1 className="shop-overlay__title">Chrome &amp; cuts</h1>
                    </div>
                </div>
                <div className="shop-overlay__vitals" aria-label="Run resources">
                    <span className="shop-overlay__vital">
                        <span className="shop-overlay__vital-label">Integrity</span>
                        <span className="shop-overlay__vital-value">{playerHealth}/{maxHealth}</span>
                    </span>
                    <span className="shop-overlay__vital shop-overlay__vital--creds">
                        <span className="shop-overlay__vital-label">Creds</span>
                        <span className="shop-overlay__vital-value">{gold}¤</span>
                    </span>
                </div>
            </div>

            {stockOffers.length > 0 && (
                <section className="shop-overlay__section" aria-label="Stock">
                    <h2 className="shop-overlay__section-title">On the slab</h2>
                    <div className="shop-overlay__stock">
                        {stockOffers.map((offer) =>
                        {
                            const state = getOfferState(
                                offer,
                                purchasedIds,
                                gold,
                                playerHealth,
                                maxHealth,
                                deck.length,
                                rerouteEntries.length,
                                upgradeEntries.length,
                            );

                            return (
                                <StockTile
                                    key={offer.id}
                                    offer={offer}
                                    state={state}
                                    onBuy={() => handleBuy(offer)}
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {serviceOffers.length > 0 && (
                <section className="shop-overlay__section" aria-label="Services">
                    <h2 className="shop-overlay__section-title">Clinic services</h2>
                    <div className="shop-overlay__services">
                        {serviceOffers.map((offer) =>
                        {
                            const state = getOfferState(
                                offer,
                                purchasedIds,
                                gold,
                                playerHealth,
                                maxHealth,
                                deck.length,
                                rerouteEntries.length,
                                upgradeEntries.length,
                            );

                            return (
                                <ServiceTile
                                    key={offer.id}
                                    offer={offer}
                                    state={state}
                                    onBuy={() => handleBuy(offer)}
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            <button type="button" className="shop-overlay__continue" onClick={onContinue}>
                Leave shop
            </button>
        </ModalShell>
    );
};
