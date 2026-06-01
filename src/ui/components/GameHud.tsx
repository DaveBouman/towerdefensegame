import { EventBus } from '../../game/EventBus';
import { deploymentUnitLabel } from '../../game/config/deploymentConfig';
import { PLAYER_PLACEMENT_ROW_COUNT } from '../../game/config/placementZone';
import { hasWaveDefinition } from '../../game/config/waveCatalog';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import { useGameViewModel } from '../viewmodels/useGameViewModel';

export const GameHud = () =>
{
    const { gold, wave, lives, canStartWave, deployment, upgradePick } = useGameViewModel();
    const nextWave = wave + 1;

    const handleStartWave = () =>
    {
        EventBus.emit(GAME_EVENTS.START_WAVE);
    };

    const betweenWaves = canStartWave && !upgradePick && !deployment?.active;

    const deployHint = deployment?.active && deployment.nextArchetype
        ? `Place ${deploymentUnitLabel(deployment.nextArchetype)} (${deployment.placedCount + 1}/${deployment.totalCount}) on the bottom ${PLAYER_PLACEMENT_ROW_COUNT} rows`
        : betweenWaves
            ? `Drag towers on the bottom ${PLAYER_PLACEMENT_ROW_COUNT} rows to reposition, or select one and click an empty tile`
            : null;

    const hasNextWave = hasWaveDefinition(nextWave);

    const startLabel = deployment?.active
        ? 'Place your units first'
        : !hasNextWave
            ? 'All waves cleared'
            : wave === 0
                ? 'Start Wave 1'
                : `Start Wave ${nextWave}`;

    return (
        <aside className="game-hud">
            <span>Gold {gold}</span>
            <span>Wave {wave}</span>
            <span>Lives {lives}</span>
            {deployHint && (
                <span className="game-hud__deploy-hint">{deployHint}</span>
            )}
            <button
                type="button"
                className="game-hud__start-wave"
                disabled={!canStartWave || !hasNextWave}
                onClick={handleStartWave}
            >
                {startLabel}
            </button>
        </aside>
    );
};
