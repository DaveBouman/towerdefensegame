import { useMemo, useState } from 'react';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import { listUpgradableCardsInDeck } from '../../game/run/cardUpgrades';
import { getRestHealAmount, REST_HEAL_FRACTION } from '../../game/run/restSite';
import { NodeKindIcon } from './NodeKindIcon';

interface RestOverlayProps {
    deck: readonly string[];
    playerHealth: number;
    maxHealth: number;
    onRest: (healAmount: number) => void;
    onUpgrade: (definitionId: string) => void;
    onContinue: () => void;
}

interface DeckEntry {
    definitionId: string;
    label: string;
    count: number;
}

const buildUpgradeEntries = (deck: readonly string[]): DeckEntry[] =>
{
    const ids = listUpgradableCardsInDeck(deck);
    const counts = new Map<string, number>();

    for (const id of deck)
    {
        if (!ids.includes(id))
        {
            continue;
        }

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
 * Pre-boss safehouse — rest for integrity or upgrade one deck card (pick one).
 */
export const RestOverlay = ({
    deck,
    playerHealth,
    maxHealth,
    onRest,
    onUpgrade,
    onContinue,
}: RestOverlayProps) =>
{
    const [ pickingUpgrade, setPickingUpgrade ] = useState(false);
    const [ choiceMade, setChoiceMade ] = useState(false);
    const healAmount = Math.min(getRestHealAmount(maxHealth), maxHealth - playerHealth);
    const upgradeEntries = useMemo(() => buildUpgradeEntries(deck), [ deck ]);
    const canUpgrade = upgradeEntries.length > 0;
    const atFullHealth = playerHealth >= maxHealth;
    const nothingAvailable = atFullHealth && !canUpgrade;

    const confirmUpgrade = (definitionId: string): void =>
    {
        onUpgrade(definitionId);
        setPickingUpgrade(false);
        setChoiceMade(true);
    };

    if (pickingUpgrade)
    {
        return (
            <div className="shop-overlay rest-overlay">
                <div className="shop-overlay__panel">
                    <p className="shop-overlay__eyebrow">Safehouse</p>
                    <h1 className="shop-overlay__title">Choose a card to upgrade</h1>
                    <p className="shop-overlay__subtitle">Free chrome grind — this cannot be undone.</p>
                    <ul className="shop-overlay__deck-list">
                        {upgradeEntries.map((entry) => (
                            <li key={entry.definitionId}>
                                <button
                                    type="button"
                                    className="shop-overlay__deck-card"
                                    onClick={() => confirmUpgrade(entry.definitionId)}
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
                        onClick={() => setPickingUpgrade(false)}
                    >
                        Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="shop-overlay rest-overlay">
            <div className="shop-overlay__panel">
                <div className="shop-overlay__header">
                    <span className="shop-overlay__icon">
                        <NodeKindIcon kind="rest" />
                    </span>
                    <div>
                        <p className="shop-overlay__eyebrow">Safehouse</p>
                        <h1 className="shop-overlay__title">Stasis pod online</h1>
                        <p className="shop-overlay__subtitle">
                            Integrity {playerHealth}/{maxHealth} · pick one benefit before the Warden
                        </p>
                    </div>
                </div>

                <ul className="shop-overlay__offers">
                    <li>
                        <button
                            type="button"
                            className={`shop-overlay__offer${choiceMade ? ' shop-overlay__offer--bought' : ''}`}
                            disabled={choiceMade}
                            onClick={() =>
                            {
                                onRest(healAmount);
                                setChoiceMade(true);
                            }}
                        >
                            <div className="shop-overlay__offer-main">
                                <span className="shop-overlay__offer-kind">Rest</span>
                                <span className="shop-overlay__offer-label">Patch integrity</span>
                                <span className="shop-overlay__offer-blurb">
                                    {atFullHealth
                                        ? 'Already at full integrity — resting wastes the benefit.'
                                        : `Restore ${healAmount} HP (${Math.round(REST_HEAL_FRACTION * 100)}% of max).`}
                                </span>
                            </div>
                            <span className="shop-overlay__offer-price">{choiceMade ? 'Used' : 'Free'}</span>
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            className={`shop-overlay__offer${choiceMade ? ' shop-overlay__offer--bought' : ''}`}
                            disabled={choiceMade || !canUpgrade}
                            onClick={() => setPickingUpgrade(true)}
                        >
                            <div className="shop-overlay__offer-main">
                                <span className="shop-overlay__offer-kind">Upgrade</span>
                                <span className="shop-overlay__offer-label">Chrome grind</span>
                                <span className="shop-overlay__offer-blurb">
                                    {canUpgrade
                                        ? 'Upgrade one card in your deck to its + form.'
                                        : 'No upgradable cards left in your deck.'}
                                </span>
                            </div>
                            <span className="shop-overlay__offer-price">{choiceMade ? 'Used' : 'Free'}</span>
                        </button>
                    </li>
                </ul>

                <button
                    type="button"
                    className="shop-overlay__continue"
                    disabled={!choiceMade && !nothingAvailable}
                    onClick={onContinue}
                >
                    {nothingAvailable
                        ? 'Continue to Warden'
                        : choiceMade
                            ? 'Continue to Warden'
                            : 'Choose rest or upgrade'}
                </button>
            </div>
        </div>
    );
};
