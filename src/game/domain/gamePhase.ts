import type { GameStateSnapshot } from './types';

type CombatPhaseState = Pick<
    GameStateSnapshot,
    'wave' | 'upgradePick' | 'towerDraftPick' | 'canStartWave' | 'runOutcome'
>;

type BetweenWavesState = Pick<GameStateSnapshot, 'canStartWave' | 'upgradePick'>;

type ManageTowersState = Pick<
    GameStateSnapshot,
    'wave' | 'upgradePick' | 'towerDraftPick' | 'canStartWave' | 'deployment' | 'runOutcome'
>;

export const isCombatActive = (state: CombatPhaseState): boolean =>
    state.runOutcome === 'playing'
    && state.wave > 0
    && !state.upgradePick
    && !state.towerDraftPick
    && !state.canStartWave;

export const isBetweenWaves = (
    state: BetweenWavesState,
    livingEnemyCount: number,
): boolean =>
    state.canStartWave
    && !state.upgradePick
    && livingEnemyCount === 0;

/** UI-safe upgrade gate (snapshot has no enemy count; canStartWave implies none alive). */
export const canUpgradeUnits = (state: BetweenWavesState): boolean =>
    state.canStartWave && !state.upgradePick;

export const canManagePlacedTowers = (
    state: ManageTowersState,
    livingEnemyCount = 0,
    deploymentActive?: boolean,
): boolean =>
{
    if (state.upgradePick || state.towerDraftPick || isCombatActive(state))
    {
        return false;
    }

    const deployment = deploymentActive ?? state.deployment?.active === true;

    return deployment || isBetweenWaves(state, livingEnemyCount);
};
