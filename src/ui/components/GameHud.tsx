import { EventBus } from '../../game/EventBus';
import { deploymentUnitLabel } from '../../game/config/deploymentConfig';
import { PLAYER_PLACEMENT_ROW_COUNT } from '../../game/config/placementZone';
import { hasWaveDefinition } from '../../game/config/waveCatalog';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import { useGameViewModel } from '../viewmodels/useGameViewModel';

export const GameHud = () =>
{
    const { gold, wave, lives, canStartWave, deployment, upgradePick, towerDraftPick } = useGameViewModel();
    const nextWave = wave + 1;

    const handleStartWave = () =>
    {
        EventBus.emit(GAME_EVENTS.START_WAVE);
    };

    const canReposition = !upgradePick && (deployment?.active || canStartWave);
    const dragHint = `Drag placed towers on the bottom ${PLAYER_PLACEMENT_ROW_COUNT} rows to reposition them`;
    const hasPlacedTowers = (deployment?.placedCount ?? 0) > 0 || (canStartWave && wave >= 0);

    const deployHint = towerDraftPick
        ? null
        : deployment?.active && deployment.nextTowerId
            ? `Place ${deploymentUnitLabel(deployment.nextTowerId)} (${deployment.placedCount + 1}/${deployment.totalCount}) on the green rows.${deployment.placedCount > 0 ? ` ${dragHint}` : ''}`
        : canReposition && hasPlacedTowers
            ? dragHint
            : null;

    const hasNextWave = hasWaveDefinition(nextWave);

    const startLabel = !hasNextWave
        ? 'All waves cleared'
        : wave === 0
            ? 'Start Wave 1'
            : `Start Wave ${nextWave}`;

    return (
        <aside className="game-hud">
            <span>Gold {gold}</span>
            <span>Wave {wave}</span>
            <span>HP {lives}</span>
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
