import { useState } from 'react';
import { EventBus } from '../../game/EventBus';
import {
    getTowerDefinition,
    tierLabel,
    type TowerDefinitionId,
} from '../../game/config/towerCatalog';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import { useGameViewModel } from '../viewmodels/useGameViewModel';

const formatStatLine = (towerId: TowerDefinitionId): string =>
{
    const def = getTowerDefinition(towerId);

    if (!def)
    {
        return '';
    }

    const { profile } = def;

    return `HP ${profile.maxHealth} · ${profile.damage} dmg · ${profile.range} range · ${profile.attacksPerSecond}/s`;
};

export const TowerDraftPick = () =>
{
    const { towerDraftPick } = useGameViewModel();
    const [ selectedId, setSelectedId ] = useState<TowerDefinitionId | null>(null);

    if (!towerDraftPick?.choices.length)
    {
        return null;
    }

    const confirm = (): void =>
    {
        if (!selectedId || !towerDraftPick.choices.includes(selectedId))
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.CONFIRM_TOWER_DRAFT, { towerId: selectedId });
        setSelectedId(null);
    };

    return (
        <div className="tower-draft-pick" role="dialog" aria-modal="true" aria-labelledby="tower-draft-title">
            <div className="tower-draft-pick__panel">
                <h2 id="tower-draft-title" className="tower-draft-pick__title">
                    Choose your tower
                </h2>
                <p className="tower-draft-pick__hint">
                    Pick 1 of 5 random units. Higher tiers appear more often in later waves.
                </p>
                <div className="tower-draft-pick__choices">
                    {towerDraftPick.choices.map((id) =>
                    {
                        const def = getTowerDefinition(id);

                        if (!def)
                        {
                            return null;
                        }

                        const isSelected = selectedId === id;

                        return (
                            <button
                                key={id}
                                type="button"
                                className={`tower-draft-pick__choice${isSelected ? ' tower-draft-pick__choice--selected' : ''}`}
                                onClick={() => setSelectedId(id)}
                            >
                                <span className={`tower-draft-pick__tier tower-draft-pick__tier--${def.tier}`}>
                                    {tierLabel(def.tier)}
                                </span>
                                <span className="tower-draft-pick__name">{def.profile.unitType}</span>
                                <span className="tower-draft-pick__stats">{formatStatLine(id)}</span>
                            </button>
                        );
                    })}
                </div>
                <button
                    type="button"
                    className="tower-draft-pick__confirm"
                    disabled={!selectedId}
                    onClick={confirm}
                >
                    Confirm and place on map
                </button>
            </div>
        </div>
    );
};
