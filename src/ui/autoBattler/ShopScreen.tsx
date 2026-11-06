import { useState } from 'react';
import { AUTO_BATTLER_RULES } from '../../game/autoBattler';
import type { AutoBattlerController } from '../../autoBattlerController/useAutoBattlerController';
import { CyberPanel } from '../components/CyberPanel';
import { UnitCard, unitFromInstance, unitFromOffer } from './UnitCard';

interface ShopScreenProps {
    controller: AutoBattlerController;
}

export const ShopScreen = ({ controller }: ShopScreenProps) =>
{
    const { state, onBuy, onSell, onReroll, onFreeze, onMove, onEndTurn } = controller;
    const { player } = state;
    const [ selectedTeamIndex, setSelectedTeamIndex ] = useState<number | null>(null);

    const handleTeamClick = (index: number) =>
    {
        const unit = player.team[index];

        if (selectedTeamIndex !== null && selectedTeamIndex !== index)
        {
            onMove(selectedTeamIndex, index);
            setSelectedTeamIndex(null);

            return;
        }

        if (!unit)
        {
            setSelectedTeamIndex(null);

            return;
        }

        setSelectedTeamIndex((prev) => (prev === index ? null : index));
    };

    return (
        <div className="ab-screen ab-shop">
            <CyberPanel variant="cyan" className="ab-panel">
                <header className="ab-header">
                    <div>
                        <p className="ab-eyebrow">Shop · Turn {player.turn}</p>
                        <h2 className="ab-title">Signal Stable</h2>
                    </div>
                    <div className="ab-meters">
                        <span>Gold {player.gold}</span>
                        <span>Lives {player.lives}</span>
                        <span>Wins {player.wins}/{AUTO_BATTLER_RULES.winsToVictory}</span>
                        <span>Tier {player.tier}</span>
                    </div>
                </header>

                <p className="ab-hint">{state.lastMessage} Front = left. Click two team slots to swap.</p>

                <section className="ab-row-block">
                    <h3 className="ab-row-label">Your team</h3>
                    <div className="ab-row ab-row--team">
                        {player.team.map((slot, index) => (
                            <div key={`team-${index}`} className="ab-slot">
                                {slot ? (
                                    <UnitCard
                                        {...unitFromInstance(slot)}
                                        selected={selectedTeamIndex === index}
                                        onClick={() => handleTeamClick(index)}
                                        footer="Sell ↓"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        className={[
                                            'ab-empty',
                                            selectedTeamIndex !== null ? 'ab-empty--target' : '',
                                        ].filter(Boolean).join(' ')}
                                        onClick={() => handleTeamClick(index)}
                                    >
                                        Empty
                                    </button>
                                )}
                                {slot ? (
                                    <button
                                        type="button"
                                        className="ab-mini-btn"
                                        onClick={() => onSell(slot.uid)}
                                    >
                                        Sell (+{AUTO_BATTLER_RULES.sellReward})
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="ab-row-block">
                    <h3 className="ab-row-label">Shop</h3>
                    <div className="ab-row ab-row--shop">
                        {player.offers.map((offer) => (
                            <div key={offer.uid} className="ab-slot">
                                <UnitCard
                                    {...unitFromOffer(offer)}
                                    onClick={() => onBuy(offer.uid)}
                                    footer={`Buy ${AUTO_BATTLER_RULES.buyCost}g`}
                                />
                                <button
                                    type="button"
                                    className="ab-mini-btn"
                                    onClick={() => onFreeze(offer.uid)}
                                >
                                    {offer.frozen ? 'Unfreeze' : 'Freeze'}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="ab-actions">
                    <button
                        type="button"
                        className="ab-btn ab-btn--ghost"
                        disabled={player.gold < AUTO_BATTLER_RULES.rerollCost}
                        onClick={onReroll}
                    >
                        Reroll ({AUTO_BATTLER_RULES.rerollCost}g)
                    </button>
                    <button
                        type="button"
                        className="ab-btn ab-btn--primary"
                        onClick={onEndTurn}
                    >
                        End turn → Battle
                    </button>
                </footer>
            </CyberPanel>
        </div>
    );
};
