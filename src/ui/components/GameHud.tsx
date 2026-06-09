import { EventBus } from '../../game/EventBus';
import { deploymentUnitLabel } from '../../game/config/deploymentConfig';
import { PLAYER_PLACEMENT_ROW_COUNT } from '../../game/config/placementZone';
import { hasWaveDefinition } from '../../game/config/waveCatalog';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import { canManagePlacedTowers, isCombatActive } from '../../game/domain/gamePhase';
import { useGameViewModel } from '../viewmodels/useGameViewModel';
import { RaceLegendPanel } from './RaceLegendPanel';

export const GameHud = () =>
{
    const { gold, wave, lives, canStartWave, paused, deployment, upgradePick, towerDraftPick } = useGameViewModel();
    const nextWave = wave + 1;

    const handleStartWave = () =>
    {
        EventBus.emit(GAME_EVENTS.START_WAVE);
    };

    const handleTogglePause = () =>
    {
        EventBus.emit(GAME_EVENTS.TOGGLE_PAUSE);
    };

    const combatActive = isCombatActive({ wave, upgradePick, towerDraftPick, canStartWave });

    const canReposition = canManagePlacedTowers({
        wave,
        upgradePick,
        towerDraftPick,
        canStartWave,
        deployment,
    });
    const dragHint = `Drag placed towers on the bottom ${PLAYER_PLACEMENT_ROW_COUNT} rows to reposition them`;
    const hasPlacedTowers = (deployment?.placedCount ?? 0) > 0 || (canStartWave && wave >= 0);

    const deployHint = towerDraftPick
        ? null
        : deployment?.active && deployment.nextTowerId
            ? `Drag ${deploymentUnitLabel(deployment.nextTowerId)} from Upcoming towers onto the green rows (${deployment.placedCount + 1}/${deployment.totalCount}).${deployment.placedCount > 0 ? ` ${dragHint}` : ''}`
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
            {combatActive && (
                <button
                    type="button"
                    className={`game-hud__pause${paused ? ' game-hud__pause--active' : ''}`}
                    onClick={handleTogglePause}
                    title={paused ? 'Resume (H)' : 'Pause (H)'}
                >
                    {paused ? 'Resume' : 'Pause'}
                </button>
            )}
            <RaceLegendPanel />
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
